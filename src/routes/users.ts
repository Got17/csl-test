import { Router } from 'express';
import multer from 'multer';
import { ErrorCode } from '../constants/error-code';
import { MultipartErrorCode } from '../constants/validation';
import { getProfile, updateProfile } from '../controllers/profile';
import { requireAccessToken } from '../middlewares/access-token';
import { sendBadRequest } from '../utils/error-response';

export const usersRouter = Router();

usersRouter.get('/me', requireAccessToken, getProfile);

const parseProfileFormData = multer({
  limits: {
    fields: 2,
    fieldNameSize: 64,
    fieldSize: 512,
    files: 0,
    parts: 2,
  },
}).none();

usersRouter.patch('/me', requireAccessToken, (req, res, next) => {
  parseProfileFormData(req, res, (error) => {
    if (error) {
      const tooManyFields = error instanceof multer.MulterError
        && (error.code === MultipartErrorCode.FieldCount || error.code === MultipartErrorCode.PartCount);
      sendBadRequest(res, tooManyFields ? ErrorCode.ValidationUnknownField : ErrorCode.ValidationInvalidField);
      return;
    }
    next();
  });
}, updateProfile);
