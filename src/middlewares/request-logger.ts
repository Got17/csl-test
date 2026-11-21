import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { LogEvent, LogHeader } from '../constants/logging';
import { logInfo } from '../utils/logger';

export function logRequest(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startTime = process.hrtime.bigint();
  res.locals.requestId = requestId;
  res.setHeader(LogHeader.RequestId, requestId);

  res.on('finish', () => {
    const durationMilliseconds = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    logInfo(LogEvent.RequestCompleted, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMilliseconds: Number(durationMilliseconds.toFixed(2)),
    });
  });

  next();
}
