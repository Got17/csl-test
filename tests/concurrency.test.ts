import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { after, test } from 'node:test';
import { Client } from 'pg';
import request from 'supertest';
import { UniqueConstraintError } from 'sequelize';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { User } from '../src/models/user';

if (process.env.DB_NAME !== 'csl_otp_test') {
  throw new Error('Integration tests require an isolated database named csl_otp_test');
}

const WRITE_DELAY_SECONDS = 0.5;
const OVERLAP_TIMEOUT_MS = 5000;
const OVERLAP_POLL_INTERVAL_MS = 25;

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

async function withDelayedOtpWrite(
  phone: string,
  operation: 'INSERT' | 'UPDATE',
  run: () => Promise<void>,
): Promise<void> {
  const fixtureName = `concurrency_test_${randomInt(0, 1_000_000_000)}`;
  await sequelize.query(`
    CREATE FUNCTION ${fixtureName}() RETURNS trigger AS $$
    BEGIN
      PERFORM pg_sleep(${WRITE_DELAY_SECONDS});
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  try {
    await sequelize.query(`
      CREATE TRIGGER ${fixtureName}
      BEFORE ${operation} ON otp_verifications
      FOR EACH ROW
      WHEN (NEW.phone_number = '${phone}')
      EXECUTE FUNCTION ${fixtureName}()
    `);
    await run();
  } finally {
    await sequelize.query(`DROP TRIGGER IF EXISTS ${fixtureName} ON otp_verifications`);
    await sequelize.query(`DROP FUNCTION ${fixtureName}()`);
  }
}

async function waitForOverlappingRequests(phone: string, minimumWaiters: number): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();
  try {
    const deadline = Date.now() + OVERLAP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const result = await client.query<{ waiting: number }>(
        `SELECT COUNT(*)::integer AS waiting FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'
         AND wait_event = 'advisory' AND position($1 IN query) > 0`,
        [phone],
      );
      if (result.rows[0].waiting >= minimumWaiters) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, OVERLAP_POLL_INTERVAL_MS));
    }
    assert.fail(`Expected ${minimumWaiters} concurrent requests waiting on the same phone number`);
  } finally {
    await client.end();
  }
}

test('overlapping OTP issuance respects the three-request limit', async () => {
  const phone = phoneNumber();
  await withDelayedOtpWrite(phone, 'INSERT', async () => {
    const pending = Promise.all(Array.from({
      length: 5,
    }, () => request(app).post('/api/auth/otp').send({
      phone_number: phone,
    })));
    try {
      await waitForOverlappingRequests(phone, 2);
    } finally {
      await pending;
    }
    const responses = await pending;
    assert.equal(responses.filter((response) => response.status === 200).length, 3);
    assert.equal(responses.filter((response) => response.status === 429).length, 2);
  });
});

test('overlapping wrong attempts persist and lock the OTP after three failures', async () => {
  const phone = phoneNumber();
  const otp = await requestOtp(phone);
  const wrongCode = otp.code === '000000' ? '000001' : '000000';
  await withDelayedOtpWrite(phone, 'UPDATE', async () => {
    const pending = Promise.all(Array.from({
      length: 5,
    }, () => request(app).post('/api/auth/register')
      .set('Authorization', `Bearer ${otp.token}`)
      .send({
        otp_code: wrongCode,
        name: 'John Doe',
      })));
    try {
      await waitForOverlappingRequests(phone, 2);
    } finally {
      await pending;
    }
    const responses = await pending;
    assert.equal(responses.filter((response) => response.status === 400).length, 3);
    assert.equal(responses.filter((response) => response.status === 429).length, 2);
  });

  const correctAttempt = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(correctAttempt.status, 429);
  assert.equal(correctAttempt.body.code, 'OTP_ERR_MAX_ATTEMPT');
});

test('OTP replacement and verification produce one consistent account outcome', async () => {
  const phone = phoneNumber();
  const first = await requestOtp(phone);
  await withDelayedOtpWrite(phone, 'UPDATE', async () => {
    const pending = Promise.all([
      request(app).post('/api/auth/otp').send({
        phone_number: phone,
      }),
      request(app).post('/api/auth/register')
        .set('Authorization', `Bearer ${first.token}`)
        .send({
          otp_code: first.code,
          name: 'John Doe',
        }),
    ]);
    try {
      await waitForOverlappingRequests(phone, 1);
    } finally {
      await pending;
    }
    const [replacement, registration] = await pending;
    assert.equal(replacement.status, 200);
    assert.ok([200, 400].includes(registration.status));

    const secondRegistration = await request(app).post('/api/auth/register')
      .set('Authorization', `Bearer ${replacement.headers['x-temporary-token']}`)
      .send({
        otp_code: replacement.body.data.otp_code,
        name: 'John Doe',
      });
    assert.equal(secondRegistration.status, registration.status === 200 ? 409 : 200);
    assert.equal(await User.count({
      where: {
        phone_number: phone,
      },
    }), 1);
  });
});

test('the database prevents duplicate user phone numbers', async () => {
  const phone = phoneNumber();
  const otp = await requestOtp(phone);
  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${otp.token}`)
    .send({
      otp_code: otp.code,
      name: 'John Doe',
    });
  assert.equal(registration.status, 200);
  await assert.rejects(User.create({
    phone_number: phone,
    name: 'Duplicate',
  }), UniqueConstraintError);
  assert.equal(await User.count({
    where: {
      phone_number: phone,
    },
  }), 1);
});

test('concurrent logins cannot consume the same OTP twice', async () => {
  const phone = phoneNumber();
  const first = await requestOtp(phone);
  const registration = await request(app).post('/api/auth/register')
    .set('Authorization', `Bearer ${first.token}`)
    .send({
      otp_code: first.code,
      name: 'John Doe',
    });
  assert.equal(registration.status, 200);
  const loginOtp = await requestOtp(phone);
  await withDelayedOtpWrite(phone, 'UPDATE', async () => {
    const pending = Promise.all(Array.from({
      length: 2,
    }, () => request(app).post('/api/auth/login')
      .set('Authorization', `Bearer ${loginOtp.token}`)
      .send({
        otp_code: loginOtp.code,
      })));
    try {
      await waitForOverlappingRequests(phone, 1);
    } finally {
      await pending;
    }
    const responses = await pending;
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
  });
});

test('a commit-time failure rolls back OTP consumption and user creation', async () => {
  const phone = phoneNumber();
  const otp = await requestOtp(phone);
  const fixtureName = `concurrency_test_${randomInt(0, 1_000_000_000)}`;
  await sequelize.query(`
    CREATE FUNCTION ${fixtureName}() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'injected commit failure';
    END;
    $$ LANGUAGE plpgsql
  `);
  try {
    await sequelize.query(`
      CREATE CONSTRAINT TRIGGER ${fixtureName}
      AFTER UPDATE ON otp_verifications
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      WHEN (NEW.phone_number = '${phone}' AND NEW.consumed_at IS NOT NULL)
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
  assert.equal(await User.count({
    where: {
      phone_number: phone,
    },
  }), 1);
});
