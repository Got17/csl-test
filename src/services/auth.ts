import jwt from 'jsonwebtoken';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database';
import { AuthAction, AuthError, JWT_ALGORITHM, TokenPurpose } from '../constants/auth';
import { PHONE_NUMBER_PATTERN } from '../constants/validation';
import { UserField } from '../constants/user';
import { OtpVerification, OtpVerificationModel } from '../models/otp-verification';
import { User, UserModel } from '../models/user';
import { messages } from '../utils/message';
import { lockPhoneNumber } from '../utils/phone-lock';

export interface TemporaryClaims {
  phoneNumber: string;
  otpId: string;
}

const MAX_OTP_ATTEMPTS = 3;
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const OTP_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function verifyTemporaryToken(token: string): TemporaryClaims | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error(messages.invalidJwtConfiguration.en);

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });
    if (typeof payload === 'string' || payload.purpose !== TokenPurpose.Otp
      || typeof payload.phone_number !== 'string' || !PHONE_NUMBER_PATTERN.test(payload.phone_number)
      || typeof payload.otp_id !== 'string' || !OTP_ID_PATTERN.test(payload.otp_id)) {
      return null;
    }
    return {
      phoneNumber: payload.phone_number,
      otpId: payload.otp_id,
    };
  } catch {
    return null;
  }
}

async function verifyOtp(
  claims: TemporaryClaims,
  otpCode: string,
  transaction: Transaction,
): Promise<{
  otp: OtpVerificationModel;
} | {
  error: AuthError;
}> {
  const otp = await OtpVerification.findOne({
    where: {
      id: claims.otpId,
      phone_number: claims.phoneNumber,
    },
    transaction,
  });

  if (!otp || otp.getDataValue('consumed_at') || otp.getDataValue('invalidated_at')
    || otp.getDataValue('expires_at').getTime() <= Date.now()) {
    return {
      error: AuthError.InvalidOtp,
    };
  }
  const attempts = otp.getDataValue('wrong_attempts');
  if (attempts >= MAX_OTP_ATTEMPTS) {
    return {
      error: AuthError.MaxAttempt,
    };
  }
  if (otp.getDataValue('otp_code') !== otpCode) {
    await otp.update({
      wrong_attempts: attempts + 1,
    }, {
      transaction,
    });
    return {
      error: AuthError.InvalidOtp,
    };
  }
  return {
    otp,
  };
}

async function findOrCreateUser(
  phoneNumber: string,
  action: AuthAction,
  name: string | undefined,
  transaction: Transaction,
): Promise<{
  user: UserModel;
} | {
  error: AuthError;
}> {
  const existingUser = await User.findOne({
    where: {
      phone_number: phoneNumber,
    },
    transaction,
  });
  if (action === AuthAction.Register && existingUser) {
    return {
      error: AuthError.UserExists,
    };
  }
  if (action === AuthAction.Login) {
    return existingUser ? {
      user: existingUser,
    } : {
      error: AuthError.UserNotFound,
    };
  }
  if (name === undefined) {
    throw new Error(messages.authenticationFailed.en);
  }
  const user = await User.create({
    phone_number: phoneNumber,
    name,
  }, {
    transaction,
  });
  return {
    user,
  };
}

export async function authenticate(
  claims: TemporaryClaims,
  otpCode: string,
  action: AuthAction,
  name?: string,
): Promise<{
  accessToken: string;
} | {
  error: AuthError;
}> {
  const secret = process.env.JWT_SECRET;
  const expiresIn = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
  if (!secret || !Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
    throw new Error(messages.invalidAccessTokenConfiguration.en);
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      await lockPhoneNumber(claims.phoneNumber, transaction);
      const verification = await verifyOtp(claims, otpCode, transaction);
      if ('error' in verification) {
        return verification;
      }
      const account = await findOrCreateUser(claims.phoneNumber, action, name, transaction);
      if ('error' in account) {
        return account;
      }

      const userId = account.user.get(UserField.Id);
      if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error(messages.invalidUserId.en);
      }
      await verification.otp.update({
        consumed_at: new Date(),
      }, {
        transaction,
      });
      const accessToken = jwt.sign({
        purpose: TokenPurpose.Access,
      }, secret, {
        subject: String(userId),
        expiresIn,
      });
      return {
        accessToken,
      };
    });
  } catch (error) {
    if (action === AuthAction.Register && error instanceof UniqueConstraintError) {
      return {
        error: AuthError.UserExists,
      };
    }
    throw error;
  }
}
