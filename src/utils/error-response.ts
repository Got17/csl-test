import { Response } from 'express';
import { ErrorCode } from '../constants/error-code';
import { messages, requestMessage } from './message';

export function sendError(res: Response, status: number, code: ErrorCode, key: keyof typeof messages): void {
  res.vary('Accept-Language');
  res.status(status).json({
    error: true,
    code,
    message: requestMessage(res.req, key),
    data: {},
  });
}

export function sendBadRequest(res: Response, code: ErrorCode = ErrorCode.ValidationInvalidField): void {
  sendError(res, 400, code, 'badRequest');
}

export function sendInternalServerError(res: Response): void {
  sendError(res, 500, ErrorCode.InternalServerError, 'internalServerError');
}
