import express, { ErrorRequestHandler } from 'express';
import { authRouter } from './routes/auth';
import { sendBadRequest, sendInternalServerError } from './utils/error-response';

export const app = express();

app.use(express.json());
app.use('/api/auth', authRouter);

const handleRequestError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    sendBadRequest(res);
    return;
  }
  console.error('Request failed:', error);
  sendInternalServerError(res);
};

app.use(handleRequestError);
