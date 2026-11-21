import { randomInt, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { OtpVerification } from '../models/otp-verification';
import { messages } from '../utils/message';

const OTP_REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const OTP_LIFETIME_MS = 60 * 1000;
const DEFAULT_TEMP_TOKEN_TTL_SECONDS = 300;
const OTP_DIGITS = 6;

export async function issueOtp(phoneNumber: string): Promise<{
  otpCode: string;
  token: string;
} | null> {
  const secret = process.env.JWT_SECRET;
  const expiresIn = Number(process.env.TEMP_TOKEN_TTL_SECONDS || DEFAULT_TEMP_TOKEN_TTL_SECONDS);
  if (!secret || !Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
    throw new Error(messages.invalidJwtConfiguration.en);
  }

  return sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:phone, 0))', {
      replacements: {
        phone: phoneNumber,
      },
      transaction,
    });

    const now = new Date();
    const count = await OtpVerification.count({
      where: {
        phone_number: phoneNumber,
        createdAt: {
          [Op.gt]: new Date(now.getTime() - REQUEST_WINDOW_MS),
        },
      },
      transaction,
    });
    if (count >= OTP_REQUEST_LIMIT) return null;

    await OtpVerification.update({
      invalidated_at: now,
    }, {
      where: {
        phone_number: phoneNumber,
        invalidated_at: null,
        consumed_at: null,
      },
      transaction,
    });

    const id = randomUUID();
    const otpCode = randomInt(0, 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, '0');
    const issuedAt = new Date();
    await OtpVerification.create({
      id,
      phone_number: phoneNumber,
      otp_code: otpCode,
      createdAt: issuedAt,
      expires_at: new Date(issuedAt.getTime() + OTP_LIFETIME_MS),
    }, {
      transaction,
    });

    const token = jwt.sign({
      phone_number: phoneNumber,
      otp_id: id,
      purpose: 'otp',
    }, secret, {
      expiresIn,
    });
    return {
      otpCode,
      token,
    };
  });
}
