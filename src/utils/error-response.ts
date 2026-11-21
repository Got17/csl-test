import { Response } from 'express';
import multer from 'multer';
import { ErrorCode } from '../constants/error-code';
import { MultipartErrorCode } from '../constants/validation';
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

export function sendMultipartError(res: Response, error: unknown, body: unknown, knownFields: readonly string[]): void {
  const tooManyFields = error instanceof multer.MulterError
    && (error.code === MultipartErrorCode.FieldCount || error.code === MultipartErrorCode.PartCount);
  const hasUnknownField = typeof body === 'object' && body !== null
    && Object.keys(body).some((field) => !knownFields.includes(field));
  const code = tooManyFields && hasUnknownField
    ? ErrorCode.ValidationUnknownField
    : ErrorCode.ValidationInvalidField;
  sendBadRequest(res, code);
}
