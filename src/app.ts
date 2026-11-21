import express, { ErrorRequestHandler } from 'express';
import path from 'node:path';
import { ErrorCode } from './constants/error-code';
import { BodyParserErrorType } from './constants/validation';
import { ProfileImageRoute, PROFILE_IMAGE_UPLOAD_DIRECTORY } from './constants/profile-image';
import { fakeOtpDelivery } from './otp-delivery/fake';
import { OtpDelivery } from './otp-delivery/otp-delivery';
import { createAuthRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { sendBadRequest, sendError, sendInternalServerError } from './utils/error-response';
import { messages } from './utils/message';

const handleRequestError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof Error && 'type' in error && error.type === BodyParserErrorType.PayloadTooLarge) {
    sendError(res, 413, ErrorCode.ValidationInvalidField, 'badRequest');
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    sendBadRequest(res);
    return;
  }
  console.error(messages.requestFailed.en, error);
  sendInternalServerError(res);
};

export function createApp(delivery: OtpDelivery = fakeOtpDelivery): express.Express {
  const app = express();
  app.use(ProfileImageRoute.PublicPath, express.static(path.resolve(PROFILE_IMAGE_UPLOAD_DIRECTORY)));
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(delivery));
  app.use('/api/users', usersRouter);
  app.use(handleRequestError);
  return app;
}

export const app = createApp();
