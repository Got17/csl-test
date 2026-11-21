import { Response } from 'express';
import { requestMessage } from './message';

export function sendBadRequest(res: Response, code = 'VALIDATION_ERR_INVALID_FIELD'): void {
  res.vary('Accept-Language');
  res.status(400).json({
    error: true,
    code,
    message: requestMessage(res.req, 'badRequest'),
    data: {},
  });
}

export function sendInternalServerError(res: Response): void {
  res.vary('Accept-Language');
  res.status(500).json({
    error: true,
    code: 'INTERNAL_SERVER_ERROR',
    message: requestMessage(res.req, 'internalServerError'),
    data: {},
  });
}
