import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { AuthAction } from '../constants/auth';
import { requestOtp } from '../controllers/auth';
import { handleAuthentication } from '../controllers/account';
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

const parseAccountFormData = multer({
  limits: {
    fields: 3,
    fieldNameSize: 64,
    fieldSize: 512,
    files: 0,
    parts: 3,
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

const parseAccountRequest: RequestHandler = (req, res, next) => {
  parseAccountFormData(req, res, (error) => {
    if (error) {
      sendBadRequest(res);
      return;
    }
    next();
  });
};

authRouter.post('/register', parseAccountRequest, (req, res) => {
  void handleAuthentication(req, res, AuthAction.Register);
});

authRouter.post('/login', parseAccountRequest, (req, res) => {
  void handleAuthentication(req, res, AuthAction.Login);
});
