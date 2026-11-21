import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AUTHORIZATION_HEADER, BEARER_TOKEN_PATTERN, JWT_ALGORITHM, TokenPurpose } from '../constants/auth';
import { ErrorCode } from '../constants/error-code';
import { LogEvent } from '../constants/logging';
import { sendError, sendInternalServerError } from '../utils/error-response';
import { logError } from '../utils/logger';

const MAX_USER_ID = 2_147_483_647;
const USER_ID_PATTERN = /^[1-9]\d*$/;

export const requireAccessToken: RequestHandler = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logError(LogEvent.MissingJwtSecret, undefined, {
      requestId: res.locals.requestId,
    });
    sendInternalServerError(res);
    return;
  }

  const authorization = req.get(AUTHORIZATION_HEADER) || '';
  const match = BEARER_TOKEN_PATTERN.exec(authorization);
  if (!match) {
    sendError(res, 401, ErrorCode.InvalidToken, 'invalidAccessToken');
    return;
  }

  try {
    const payload = jwt.verify(match[1], secret, {
      algorithms: [JWT_ALGORITHM],
    });
    if (typeof payload === 'string' || payload.purpose !== TokenPurpose.Access
      || typeof payload.sub !== 'string' || !USER_ID_PATTERN.test(payload.sub)) {
      sendError(res, 401, ErrorCode.InvalidToken, 'invalidAccessToken');
      return;
    }
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId > MAX_USER_ID) {
      sendError(res, 401, ErrorCode.InvalidToken, 'invalidAccessToken');
      return;
    }
    res.locals.userId = userId;
    next();
  } catch {
    sendError(res, 401, ErrorCode.InvalidToken, 'invalidAccessToken');
  }
};
