import { Router } from 'express';
import multer from 'multer';
import { UserField } from '../constants/user';
import {
  PROFILE_IMAGE_MAX_SIZE_BYTES,
  ProfileImageFormField,
  ProfileImageMimeType,
  ProfileImageRoute,
} from '../constants/profile-image';
import { getProfile, updateProfile, uploadProfileImage } from '../controllers/profile';
import { requireAccessToken } from '../middlewares/access-token';
import { sendMultipartError } from '../utils/error-response';

export const usersRouter = Router();

usersRouter.get('/me', requireAccessToken, getProfile);

const parseProfileImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PROFILE_IMAGE_MAX_SIZE_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = Object.values(ProfileImageMimeType) as string[];
    callback(null, allowedTypes.includes(file.mimetype));
  },
}).single(ProfileImageFormField.File);

usersRouter.post(ProfileImageRoute.Upload, requireAccessToken, (req, res, next) => {
  parseProfileImage(req, res, (error) => {
    if (error) {
      sendMultipartError(res, error, req.body, []);
      return;
    }
    next();
  });
}, uploadProfileImage);

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
