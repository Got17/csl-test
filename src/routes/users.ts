import { Router } from 'express';
import multer from 'multer';
import { UserField } from '../constants/user';
import { getProfile, updateProfile } from '../controllers/profile';
import { requireAccessToken } from '../middlewares/access-token';
import { sendMultipartError } from '../utils/error-response';

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
      sendMultipartError(res, error, req.body, [UserField.Name]);
      return;
    }
    next();
  });
}, updateProfile);
