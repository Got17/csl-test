import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { after, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';

if (process.env.DB_NAME !== 'csl_otp_test') {
  throw new Error('Integration tests require an isolated database named csl_otp_test');
}

after(async () => {
  await sequelize.close();
});

function phoneNumber(): string {
  return `856${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
}

function assertUnknownField(response: request.Response): void {
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: true,
    code: 'VALIDATION_ERR_UNKNOWN_FIELD',
    message: 'Bad Request',
    data: {},
  });
}

function assertSuccessEnvelope(response: request.Response): void {
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ['code', 'data', 'error', 'message']);
  assert.equal(response.body.error, false);
  assert.equal(response.body.code, 0);
  assert.equal(response.body.message, 'Success');
  assert.equal(typeof response.body.data, 'object');
}

test('unknown multipart fields return the required error across authentication endpoints', async () => {
  const phone = phoneNumber();
  const invalidOtpRequest = await request(app).post('/api/auth/otp')
    .field('phone_number', phone)
    .field('first_extra', 'value')
    .field('second_extra', 'value');
  assertUnknownField(invalidOtpRequest);

  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(otp.status, 200);
  const token = otp.headers['x-temporary-token'] as string;
  const code = otp.body.data.otp_code as string;

  const invalidRegister = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${token}`)
    .field('otp_code', code)
    .field('name', 'John Doe')
    .field('first_extra', 'value')
    .field('second_extra', 'value');
  assertUnknownField(invalidRegister);

  const invalidLogin = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${token}`)
    .field('otp_code', code)
    .field('first_extra', 'value')
    .field('second_extra', 'value')
    .field('third_extra', 'value');
  assertUnknownField(invalidLogin);
});

test('oversized JSON receives a client error in the standard response envelope', async () => {
  const response = await request(app).post('/api/auth/otp').send({
    phone_number: '1'.repeat(110_000),
  });
  assert.equal(response.status, 413);
  assert.deepEqual(response.body, {
    error: true,
    code: 'VALIDATION_ERR_INVALID_FIELD',
    message: 'Bad Request',
    data: {},
  });
});

test('repeated known multipart fields do not produce an unknown-field error', async () => {
  const phone = phoneNumber();
  const response = await request(app).post('/api/auth/otp')
    .field('phone_number', phone)
    .field('phone_number', phone)
    .field('phone_number', phone);
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERR_INVALID_FIELD');
});

test('multipart limit takes precedence when an unknown field is not parsed', async () => {
  const phone = phoneNumber();
  const response = await request(app).post('/api/auth/otp')
    .field('phone_number', phone)
    .field('phone_number', phone)
    .field('unexpected', 'value');
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERR_INVALID_FIELD');
});

test('repeated known multipart fields stay invalid rather than unknown on account and profile endpoints', async () => {
  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phoneNumber(),
  });
  assertSuccessEnvelope(otp);
  const temporaryToken = otp.headers['x-temporary-token'] as string;
  const code = otp.body.data.otp_code as string;

  const repeatedRegister = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${temporaryToken}`)
    .field('otp_code', code)
    .field('name', 'John Doe')
    .field('name', 'John Doe')
    .field('name', 'John Doe');
  assert.equal(repeatedRegister.status, 400);
  assert.equal(repeatedRegister.body.code, 'VALIDATION_ERR_INVALID_FIELD');

  const repeatedLogin = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${temporaryToken}`)
    .field('otp_code', code)
    .field('otp_code', code)
    .field('otp_code', code)
    .field('otp_code', code);
  assert.equal(repeatedLogin.status, 400);
  assert.equal(repeatedLogin.body.code, 'VALIDATION_ERR_INVALID_FIELD');

  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${temporaryToken}`)
    .send({
      otp_code: code,
      name: 'John Doe',
    });
  assertSuccessEnvelope(registration);
  const repeatedProfile = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${registration.body.data.access_token}`)
    .field('name', 'Jane')
    .field('name', 'Jane')
    .field('name', 'Jane');
  assert.equal(repeatedProfile.status, 400);
  assert.equal(repeatedProfile.body.code, 'VALIDATION_ERR_INVALID_FIELD');
});

test('required endpoints use the success envelope across JSON and form-data flows', async () => {
  const phone = phoneNumber();
  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assertSuccessEnvelope(otp);

  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.headers['x-temporary-token']}`)
    .field('otp_code', otp.body.data.otp_code)
    .field('name', 'x'.repeat(100));
  assertSuccessEnvelope(registration);
  const accessToken = registration.body.data.access_token as string;

  const profile = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${accessToken}`);
  assertSuccessEnvelope(profile);
  assert.equal(profile.body.data.name.length, 100);

  const update = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: ' A ',
    });
  assertSuccessEnvelope(update);
  assert.equal(update.body.data.name, 'A');

  const loginOtp = await request(app).post('/api/auth/otp').field('phone_number', phone);
  assertSuccessEnvelope(loginOtp);
  const login = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${loginOtp.headers['x-temporary-token']}`)
    .send({
      otp_code: loginOtp.body.data.otp_code,
    });
  assertSuccessEnvelope(login);
});

test('phone and authentication inputs respect agreed boundaries', async () => {
  const minimumPhone = randomInt(10_000_000, 100_000_000).toString();
  const maximumPhone = `1${randomInt(0, 100_000_000_000_000).toString().padStart(14, '0')}`;
  for (const phone of [minimumPhone, maximumPhone]) {
    const response = await request(app).post('/api/auth/otp').send({
      phone_number: phone,
    });
    assertSuccessEnvelope(response);
  }
  for (const phone of ['1234567', '1234567890123456']) {
    const response = await request(app).post('/api/auth/otp').send({
      phone_number: phone,
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERR_INVALID_FIELD');
  }

  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phoneNumber(),
  });
  assertSuccessEnvelope(otp);
  const token = otp.headers['x-temporary-token'] as string;
  const tooLongName = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${token}`)
    .send({
      otp_code: otp.body.data.otp_code,
      name: 'x'.repeat(101),
    });
  assert.equal(tooLongName.status, 400);
  assert.equal(tooLongName.body.code, 'VALIDATION_ERR_INVALID_FIELD');

  const unknownLogin = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${token}`)
    .send({
      otp_code: otp.body.data.otp_code,
      extra: 'value',
    });
  assertUnknownField(unknownLogin);
  const numericOtp = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${token}`)
    .send({
      otp_code: 123456,
    });
  assert.equal(numericOtp.status, 400);
  assert.equal(numericOtp.body.code, 'VALIDATION_ERR_INVALID_FIELD');
});
