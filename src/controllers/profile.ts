import { Request, Response } from 'express';
import Joi from 'joi';
import { ErrorCode } from '../constants/error-code';
import { LogEvent } from '../constants/logging';
import { ValidationErrorType } from '../constants/validation';
import { UpdateProfileDto } from '../dtos/profile';
import { UserModel } from '../models/user';
import { findProfile, profileData, updateProfileName } from '../services/profile';
import { sendBadRequest, sendError, sendInternalServerError } from '../utils/error-response';
import { saveProfileImage } from '../services/profile-image';
import { nameSchema } from '../validations/name';
import { logError } from '../utils/logger';
import { messages } from '../utils/message';

const updateSchema = Joi.object<UpdateProfileDto>({
  name: nameSchema,
}).unknown(false).required();

function sendProfileResponse(res: Response, user: UserModel | null): void {
  if (!user) {
    sendError(res, 404, ErrorCode.UserNotFound, 'userNotFound');
    return;
  }
  res.json({
    error: false,
    code: 0,
    message: messages.success.en,
    data: profileData(user),
  });
}

export async function getProfile(_req: Request, res: Response): Promise<void> {
  try {
    const user = await findProfile(res.locals.userId);
    sendProfileResponse(res, user);
  } catch (error) {
    logError(LogEvent.ProfileRequestFailed, error, {
      requestId: res.locals.requestId,
    });
    sendInternalServerError(res);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { error, value } = updateSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const unknownField = error.details.some((detail) => detail.type === ValidationErrorType.UnknownField);
    sendBadRequest(res, unknownField ? ErrorCode.ValidationUnknownField : ErrorCode.ValidationInvalidField);
    return;
  }

  try {
    const user = await updateProfileName(res.locals.userId, value.name);
    sendProfileResponse(res, user);
  } catch (updateError) {
    logError(LogEvent.ProfileRequestFailed, updateError, {
      requestId: res.locals.requestId,
    });
    sendInternalServerError(res);
  }
}

export async function uploadProfileImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendBadRequest(res);
    return;
  }
  try {
    const saved = await saveProfileImage(res.locals.userId, req.file);
    if (!saved) {
      sendBadRequest(res);
      return;
    }
    const user = await findProfile(res.locals.userId);
    sendProfileResponse(res, user);
  } catch (error) {
    logError(LogEvent.ProfileRequestFailed, error, {
      requestId: res.locals.requestId,
    });
    sendInternalServerError(res);
  }
}
