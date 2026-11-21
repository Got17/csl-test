import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { after, test } from 'node:test';
import request from 'supertest';
import { app, createApp } from '../src/app';
import { sequelize } from '../src/config/database';
import { OtpDelivery, OtpDeliveryOutcome } from '../src/otp-delivery/otp-delivery';

if (process.env.DB_NAME !== 'csl_otp_test') {
  throw new Error('Integration tests require an isolated database named csl_otp_test');
}

after(async () => {
  await sequelize.close();
});

function phoneNumber(): string {
  return `856${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
}

test('a simulated SMS delivery hides the OTP but preserves registration', async () => {
  const phone = phoneNumber();
  const deliveries: Array<{
    phoneNumber: string;
    otpCode: string;
  }> = [];
  const delivery: OtpDelivery = {
    async deliver(phoneNumber, otpCode) {
      deliveries.push({
        phoneNumber,
        otpCode,
      });
      return OtpDeliveryOutcome.Delivered;
    },
  };
  const smsApp = createApp(delivery);
  const response = await request(smsApp).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, {});
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].phoneNumber, phone);
  assert.match(deliveries[0].otpCode, /^\d{6}$/);

  const registration = await request(smsApp).post('/api/auth/register')
    .set('Authorization', `Bearer ${response.headers['x-temporary-token']}`)
    .send({
      otp_code: deliveries[0].otpCode,
      name: 'John Doe',
    });
  assert.equal(registration.status, 200);
});

test('a delivery failure returns an error and the OTP request remains counted', async () => {
  const phone = phoneNumber();
  const first = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(first.status, 200);

  const failingDelivery: OtpDelivery = {
    async deliver() {
      throw new Error('Simulated delivery failure');
    },
  };
  const failed = await request(createApp(failingDelivery)).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(failed.status, 500);
  assert.equal(failed.body.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(failed.headers['x-temporary-token'], undefined);

  const previousOtp = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${first.headers['x-temporary-token']}`)
    .send({
      otp_code: first.body.data.otp_code,
      name: 'John Doe',
    });
  assert.equal(previousOtp.status, 400);

  const third = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(third.status, 200);
  const fourth = await request(app).post('/api/auth/otp').send({
    phone_number: phone,
  });
  assert.equal(fourth.status, 429);
  assert.equal(fourth.body.code, 'OTP_ERR_MAX_REQUEST');
});
