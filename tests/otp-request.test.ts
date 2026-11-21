import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { OtpVerification } from '../src/models/otp-verification';

if (process.env.DB_NAME !== 'csl_otp_test') {
  throw new Error('Integration tests require an isolated database named csl_otp_test');
}

function phoneNumber(): string {
  return `856${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
}

after(async () => {
  await sequelize.close();
});

test('a valid phone number receives an OTP and a temporary token', async () => {
  const phone = phoneNumber();
  const response = await request(app)
    .post('/api/auth/otp')
    .send({
      phone_number: ` ${phone} `,
    });

  assert.equal(response.status, 200);
  assert.match(response.body.data.otp_code, /^\d{6}$/);
  assert.ok(response.headers['x-temporary-token']);
  const payload = jwt.verify(response.headers['x-temporary-token'], process.env.JWT_SECRET!) as jwt.JwtPayload;
  assert.equal(payload.phone_number, phone);
  assert.equal(payload.purpose, 'otp');
  assert.equal(payload.exp! - payload.iat!, 300);
  const record = await OtpVerification.findByPk(payload.otp_id);
  assert.ok(record);
  assert.equal(record.get('otp_code'), response.body.data.otp_code);
  assert.equal((record.get('expires_at') as Date).getTime() - (record.get('createdAt') as Date).getTime(), 60_000);
});

test('new requests invalidate earlier OTPs and the fourth request is rejected', async () => {
  const phone = phoneNumber();
  const first = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(first.status, 200);
  const second = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  const third = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(second.status, 200);
  assert.equal(third.status, 200);
  const firstPayload = jwt.verify(first.headers['x-temporary-token'], process.env.JWT_SECRET!) as jwt.JwtPayload;
  const record = await OtpVerification.findByPk(firstPayload.otp_id);
  assert.ok(record?.get('invalidated_at'));
  const fourth = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(fourth.status, 429);
  assert.deepEqual(fourth.body, {
    error: true,
    code: 'OTP_ERR_MAX_REQUEST',
    message: 'Max OTP request exceeded, Please try again next 1 hour',
    data: {},
  });
});

test('concurrent requests cannot exceed the rolling limit', async () => {
  const phone = phoneNumber();
  const responses = await Promise.all(Array.from({
    length: 5,
  }, () => request(app)
    .post('/api/auth/otp')
    .send({
      phone_number: phone,
    })));
  assert.equal(responses.filter((response) => response.status === 200).length, 3);
  assert.equal(responses.filter((response) => response.status === 429).length, 2);
});

test('requests older than one hour no longer count toward the limit', async () => {
  const phone = phoneNumber();
  for (let i = 0; i < 3; i++) {
    const response = await request(app).post('/api/auth/otp').send({
      phone_number: phone,
    });
    assert.equal(response.status, 200);
  }
  await sequelize.query("UPDATE otp_verifications SET created_at = NOW() - INTERVAL '61 minutes' WHERE phone_number = :phone", {
    replacements: {
      phone,
    },
  });
  const response = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(response.status, 200);
});

test('validates JSON and form-data and rejects unknown fields', async () => {
  const form = await request(app).post('/api/auth/otp').field('phone_number', phoneNumber());
  assert.equal(form.status, 200);
  const unknown = await request(app).post('/api/auth/otp').send({
    phone_number: phoneNumber(),
    unexpected: 'value',
  });
  assert.equal(unknown.status, 400);
  assert.deepEqual(unknown.body, {
    error: true,
    code: 'VALIDATION_ERR_UNKNOWN_FIELD',
    message: 'Bad Request',
    data: {},
  });
  for (const phone of ['123', '+8562051234567', '85620 51234567', 12345678]) {
    const response = await request(app).post('/api/auth/otp').send({
      phone_number: phone,
    });
    assert.equal(response.status, 400);
  }
});

test('malformed JSON and unexpected files receive JSON error envelopes', async () => {
  const malformed = await request(app).post('/api/auth/otp').set('Content-Type', 'application/json').send('{');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, true);
  const upload = await request(app).post('/api/auth/otp').attach('file', Buffer.from('x'), 'test.txt');
  assert.equal(upload.status, 400);
  assert.equal(upload.body.error, true);
  const badForm = await request(app).post('/api/auth/otp').set('Content-Type', 'multipart/form-data').send('invalid');
  assert.equal(badForm.status, 400);
  assert.equal(badForm.body.error, true);
  const oversized = await request(app).post('/api/auth/otp').field('phone_number', '1'.repeat(65));
  assert.equal(oversized.status, 400);
  assert.equal(oversized.body.error, true);
  const tooManyFields = await request(app)
    .post('/api/auth/otp')
    .field('phone_number', phoneNumber())
    .field('extra_one', 'x')
    .field('extra_two', 'x');
  assert.equal(tooManyFields.status, 400);
  assert.equal(tooManyFields.body.error, true);
});
