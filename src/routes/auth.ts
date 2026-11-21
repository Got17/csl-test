import { Router } from 'express';
import multer from 'multer';
import { requestOtp } from '../controllers/auth';
import { sendBadRequest } from '../utils/error-response';

export const authRouter = Router();

const parseFormData = multer({
  limits: {
    fields: 2,
    fieldNameSize: 64,
    fieldSize: 64,
    files: 0,
    parts: 2,
  },
}).none();

authRouter.post('/otp', (req, res, next) => {
  parseFormData(req, res, (error) => {
    if (error) {
      sendBadRequest(res);
      return;
    }
    next();
  });
}, requestOtp);
