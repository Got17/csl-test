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

async function registerUser() {
  const phone = `856${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
  const otp = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(otp.status, 200);
  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.headers['x-temporary-token']}`)
    .send({
      otp_code: otp.body.data.otp_code,
      name: 'John Doe',
    });
  assert.equal(registration.status, 200);
  return {
    phone,
    accessToken: registration.body.data.access_token as string,
    temporaryToken: otp.headers['x-temporary-token'] as string,
  };
}

test('a registered user can read their profile', async () => {
  const user = await registerUser();
  const profile = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.phone_number, user.phone);
  assert.equal(profile.body.data.name, 'John Doe');
  assert.equal(typeof profile.body.data.id, 'number');
  assert.deepEqual(Object.keys(profile.body.data).sort(), ['id', 'name', 'phone_number']);
});

test('an authenticated user can update their name', async () => {
  const user = await registerUser();
  const response = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .send({
      name: '  Jane Doe  ',
    });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body.data).sort(), ['id', 'name', 'phone_number']);
  const profile = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`);
  assert.equal(profile.body.data.name, 'Jane Doe');
  assert.equal(profile.body.data.phone_number, user.phone);
});

test('profile changes reject phone number and unknown fields', async () => {
  const user = await registerUser();
  const phoneUpdate = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .send({
      phone_number: '8562051111111',
      name: 'Another Name',
    });
  assert.equal(phoneUpdate.status, 400);
  assert.equal(phoneUpdate.body.code, 'VALIDATION_ERR_UNKNOWN_FIELD');
  const unknown = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .field('name', 'Another Name')
    .field('other', 'value');
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, 'VALIDATION_ERR_UNKNOWN_FIELD');
  const tooMany = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .field('name', 'Another Name')
    .field('other', 'value')
    .field('extra', 'value');
  assert.equal(tooMany.status, 400);
  assert.equal(tooMany.body.code, 'VALIDATION_ERR_UNKNOWN_FIELD');
  const profile = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`);
  assert.equal(profile.body.data.name, 'John Doe');
  assert.equal(profile.body.data.phone_number, user.phone);
});

test('profile update supports form-data and rejects invalid names', async () => {
  const user = await registerUser();
  const invalidNames = ['', ' '.repeat(3), 'x'.repeat(101), 123];
  for (const name of invalidNames) {
    const invalid = await request(app).patch('/api/users/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name,
      });
    assert.equal(invalid.status, 400);
  }
  const form = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .field('name', '  Jane Doe  ');
  assert.equal(form.status, 200);
  assert.equal(form.body.data.name, 'Jane Doe');
});

test('profile endpoints reject missing, invalid, expired and temporary tokens', async () => {
  const user = await registerUser();
  const expiredToken = jwt.sign({
    purpose: 'access',
  }, process.env.JWT_SECRET!, {
    subject: '1',
    expiresIn: -1,
  });
  const tokens = ['', 'invalid-token', user.temporaryToken, expiredToken];
  for (const token of tokens) {
    const profile = await request(app).get('/api/users/me')
      .set('Authorization', token ? `Bearer ${token}` : '');
    assert.equal(profile.status, 401);
    assert.equal(profile.body.code, 'AUTH_ERR_INVALID_TOKEN');
    const update = await request(app).patch('/api/users/me')
      .set('Authorization', token ? `Bearer ${token}` : '')
      .send({
        name: 'Unauthorized',
      });
    assert.equal(update.status, 401);
  }
});

test('a user can only access and update their own profile', async () => {
  const first = await registerUser();
  const second = await registerUser();
  const update = await request(app).patch('/api/users/me')
    .set('Authorization', `Bearer ${first.accessToken}`)
    .send({
      name: 'First User',
    });
  assert.equal(update.status, 200);
  const otherProfile = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${second.accessToken}`);
  assert.equal(otherProfile.body.data.name, 'John Doe');
  assert.equal(otherProfile.body.data.phone_number, second.phone);
});

test('a valid token for a missing user receives a localized not-found response', async () => {
  const token = jwt.sign({
    purpose: 'access',
  }, process.env.JWT_SECRET!, {
    subject: '2147483647',
    expiresIn: 60,
  });
  const response = await request(app).get('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .set('Accept-Language', 'lo');
  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'USER_ERR_NOT_FOUND');
  assert.equal(response.body.message, 'ບໍ່ພົບຜູ້ໃຊ້');
});
