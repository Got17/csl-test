import { Request, Response } from 'express';
import Joi from 'joi';
import { AUTHORIZATION_HEADER, BEARER_TOKEN_PATTERN, AuthAction, AuthError } from '../constants/auth';
import { ErrorCode } from '../constants/error-code';
import { LogEvent } from '../constants/logging';
import { ValidationErrorType } from '../constants/validation';
import { LoginDto, RegisterDto } from '../dtos/auth';
import { authenticate, verifyTemporaryToken } from '../services/auth';
import { sendBadRequest, sendError, sendInternalServerError } from '../utils/error-response';
import { logError } from '../utils/logger';
import { messages } from '../utils/message';
import { nameSchema } from '../validations/name';

const otpCode = Joi.string().pattern(/^\d{6}$/).required();
const registerSchema = Joi.object<RegisterDto>({
  otp_code: otpCode,
  name: nameSchema,
}).unknown(false).required();
const loginSchema = Joi.object<LoginDto>({
  otp_code: otpCode,
}).unknown(false).required();

function sendAuthenticationError(res: Response, error: AuthError): void {
  switch (error) {
    case AuthError.InvalidOtp:
      sendError(res, 400, ErrorCode.OtpInvalid, 'invalidOtp');
      break;
    case AuthError.MaxAttempt:
      sendError(res, 429, ErrorCode.OtpMaxAttempt, 'otpMaxAttempt');
      break;
    case AuthError.UserExists:
      sendError(res, 409, ErrorCode.UserAlreadyExists, 'userAlreadyExists');
      break;
    case AuthError.UserNotFound:
      sendError(res, 404, ErrorCode.UserNotFound, 'userNotFound');
      break;
  }
}

export async function handleAuthentication(req: Request, res: Response, action: AuthAction): Promise<void> {
  try {
    const authorization = req.get(AUTHORIZATION_HEADER) || '';
    const match = BEARER_TOKEN_PATTERN.exec(authorization);
    const claims = match ? verifyTemporaryToken(match[1]) : null;
    if (!claims) {
      sendError(res, 401, ErrorCode.InvalidToken, 'invalidTemporaryToken');
      return;
    }

    const schema = action === AuthAction.Register ? registerSchema : loginSchema;
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const unknownField = error.details.some((detail) => detail.type === ValidationErrorType.UnknownField);
      sendBadRequest(res, unknownField ? ErrorCode.ValidationUnknownField : ErrorCode.ValidationInvalidField);
      return;
    }

    const name = 'name' in value && typeof value.name === 'string' ? value.name : undefined;
    const result = await authenticate(claims, value.otp_code, action, name);
    if ('error' in result) {
      sendAuthenticationError(res, result.error);
      return;
    }
    res.json({
      error: false,
      code: 0,
      message: messages.success.en,
      data: {
        access_token: result.accessToken,
      },
    });
  } catch (error) {
    logError(LogEvent.AuthenticationFailed, error, {
      requestId: res.locals.requestId,
    });
    sendInternalServerError(res);
  }
}
