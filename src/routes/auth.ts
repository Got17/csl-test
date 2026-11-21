import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { AuthAction, AuthField } from '../constants/auth';
import { UserField } from '../constants/user';
import { requestOtp } from '../controllers/auth';
import { handleAuthentication } from '../controllers/account';
import { OtpDelivery } from '../otp-delivery/otp-delivery';
import { sendMultipartError } from '../utils/error-response';

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

function parseAccountRequest(knownFields: readonly string[]): RequestHandler {
  return (req, res, next) => {
    parseAccountFormData(req, res, (error) => {
      if (error) {
        sendMultipartError(res, error, req.body, knownFields);
        return;
      }
      next();
    });
  };
}

export function createAuthRouter(delivery: OtpDelivery): Router {
  const router = Router();

  router.post('/otp', (req, res, next) => {
    parseFormData(req, res, (error) => {
      if (error) {
        sendMultipartError(res, error, req.body, [UserField.PhoneNumber]);
        return;
      }
      next();
    });
  }, (req, res) => {
    void requestOtp(req, res, delivery);
  });

  router.post('/register', parseAccountRequest([AuthField.OtpCode, UserField.Name]), (req, res) => {
    void handleAuthentication(req, res, AuthAction.Register);
  });

  router.post('/login', parseAccountRequest([AuthField.OtpCode]), (req, res) => {
    void handleAuthentication(req, res, AuthAction.Login);
  });

  return router;
}
