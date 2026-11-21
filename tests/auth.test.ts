import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
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

async function requestOtp(phone: string) {
  const response = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(response.status, 200);
  return {
    code: response.body.data.otp_code as string,
    token: response.headers['x-temporary-token'] as string,
  };
}

test('a new user can register using an issued OTP', async () => {
  const phone = phoneNumber();
  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(otp.status, 200);

  const response = await request(app)
    .post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.headers['x-temporary-token']}`)
    .send({
      otp_code: otp.body.data.otp_code,
      name: 'John Doe',
    });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.data.access_token, 'string');
  const token = jwt.verify(response.body.data.access_token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  assert.equal(token.purpose, 'access');
  assert.match(token.sub!, /^[1-9]\d*$/);
  assert.equal(token.exp! - token.iat!, 86400);
});

test('a registered user can log in with a fresh OTP and cannot reuse it', async () => {
  const phone = phoneNumber();
  const first = await requestOtp(phone);
  const registered = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${first.token}`)
    .send({
      otp_code: first.code,
      name: 'Jane Doe',
    });
  assert.equal(registered.status, 200);

  const second = await requestOtp(phone);
  const login = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${second.token}`)
    .field('otp_code', second.code);
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.data.access_token, 'string');
  const reuse = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${second.token}`)
    .send({
      otp_code: second.code,
    });
  assert.equal(reuse.status, 400);
});

test('three wrong attempts persist and lock the OTP even for the correct code', async () => {
  const otp = await requestOtp(phoneNumber());
  const wrong = otp.code === '000000' ? '000001' : '000000';
  for (let i = 0; i < 3; i++) {
    const response = await request(app).post('/api/auth/register')
      .set('Authorization', `Bearer ${otp.token}`)
      .send({
        otp_code: wrong,
        name: 'John Doe',
      });
    assert.equal(response.status, 400);
  }
  const locked = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(locked.status, 429);
  assert.equal(locked.body.code, 'OTP_ERR_MAX_ATTEMPT');
  assert.equal(locked.body.message, 'Wrong OTP attempted exceeded, Please request new OTP instead');
});

test('duplicate registration leaves the OTP available for login', async () => {
  const phone = phoneNumber();
  const first = await requestOtp(phone);
  const registered = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${first.token}`)
    .send({
      otp_code: first.code,
      name: 'John Doe',
    });
  assert.equal(registered.status, 200);
  const second = await requestOtp(phone);
  const duplicate = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${second.token}`)
    .send({
      otp_code: second.code,
      name: 'John Doe',
    });
  assert.equal(duplicate.status, 409);
  const login = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${second.token}`)
    .send({
      otp_code: second.code,
    });
  assert.equal(login.status, 200);
});

test('login for an unknown user leaves the OTP available for registration', async () => {
  const otp = await requestOtp(phoneNumber());
  const login = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
    });
  assert.equal(login.status, 404);
  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(registration.status, 200);
});

test('replaced and expired OTPs are rejected', async () => {
  const phone = phoneNumber();
  const first = await requestOtp(phone);
  const second = await requestOtp(phone);
  const replaced = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${first.token}`)
    .send({
      otp_code: first.code,
      name: 'John Doe',
    });
  assert.equal(replaced.status, 400);
  const payload = jwt.verify(second.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  await sequelize.query("UPDATE otp_verifications SET expires_at = NOW() - INTERVAL '1 second' WHERE id = :id", {
    replacements: {
      id: payload.otp_id,
    },
  });
  const expired = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${second.token}`)
    .send({
      otp_code: second.code,
      name: 'John Doe',
    });
  assert.equal(expired.status, 400);
});

test('temporary token validation, form-data and unknown fields are enforced', async () => {
  const otp = await requestOtp(phoneNumber());
  const missing = await request(app).post('/api/auth/register').send({
    otp_code: otp.code,
    name: 'John Doe',
  });
  assert.equal(missing.status, 401);
  const invalid = await request(app).post('/api/auth/register')
    .set('Authorization', 'Bearer invalid-token')
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(invalid.status, 401);
  const claims = jwt.verify(otp.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  const expiredToken = jwt.sign({
    phone_number: claims.phone_number,
    otp_id: claims.otp_id,
    purpose: 'otp',
  }, process.env.JWT_SECRET!, {
    expiresIn: -1,
  });
  const expired = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${expiredToken}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(expired.status, 401);
  const unknown = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
      extra: 'value',
    });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, 'VALIDATION_ERR_UNKNOWN_FIELD');
  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .field('otp_code', otp.code)
    .field('name', '  John Doe  ');
  assert.equal(registration.status, 200);
  const accessToken = registration.body.data.access_token as string;
  const wrongKind = await request(app).post('/api/auth/login')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      otp_code: otp.code,
    });
  assert.equal(wrongKind.status, 401);
});

test('concurrent registrations can consume the OTP only once', async () => {
  const otp = await requestOtp(phoneNumber());
  const responses = await Promise.all(Array.from({
    length: 2,
  }, () => request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    })));
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
});

test('registration works with a trailing slash', async () => {
  const otp = await requestOtp(phoneNumber());
  const response = await request(app).post('/api/auth/register/')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(response.status, 200);
});

test('a failure after user creation rolls back both the user and OTP consumption', async () => {
  const phone = phoneNumber();
  const otp = await requestOtp(phone);
  const fixtureName = `auth_test_fail_${randomInt(0, 1_000_000_000)}`;
  await sequelize.query(`
    CREATE FUNCTION ${fixtureName}() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'injected OTP update failure';
    END;
    $$ LANGUAGE plpgsql
  `);
  try {
    await sequelize.query(`
      CREATE TRIGGER ${fixtureName}
      BEFORE UPDATE ON otp_verifications
      FOR EACH ROW
      WHEN (OLD.phone_number = '${phone}' AND NEW.consumed_at IS NOT NULL)
      EXECUTE FUNCTION ${fixtureName}()
    `);
    const failed = await request(app).post('/api/auth/register')
      .set('Authorization', `Bearer ${otp.token}`)
      .send({
        otp_code: otp.code,
        name: 'John Doe',
      });
    assert.equal(failed.status, 500);
  } finally {
    await sequelize.query(`DROP TRIGGER IF EXISTS ${fixtureName} ON otp_verifications`);
    await sequelize.query(`DROP FUNCTION ${fixtureName}()`);
  }
  const retry = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(retry.status, 200);
});
