import { Response } from 'express';

export function sendBadRequest(res: Response, code = 'VALIDATION_ERR_INVALID_FIELD'): void {
  res.status(400).json({
    error: true,
    code,
    message: 'Bad Request',
    data: {},
  });
}

export function sendInternalServerError(res: Response): void {
  res.status(500).json({
    error: true,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error',
    data: {},
  });
}
