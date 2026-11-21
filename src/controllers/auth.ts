import { Request, Response } from 'express';
import Joi from 'joi';
import { issueOtp } from '../services/otp';
import { sendBadRequest, sendInternalServerError } from '../utils/error-response';

const requestSchema = Joi.object<{
  phone_number: string;
}>({
  phone_number: Joi.string().trim().pattern(/^\d{8,15}$/).required(),
}).unknown(false).required();

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { error, value } = requestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const unknownField = error.details.some((detail) => detail.type === 'object.unknown');
    sendBadRequest(res, unknownField ? 'VALIDATION_ERR_UNKNOWN_FIELD' : 'VALIDATION_ERR_INVALID_FIELD');
    return;
  }

  try {
    const result = await issueOtp(value.phone_number);
    if (!result) {
      res.status(429).json({
        error: true,
        code: 'OTP_ERR_MAX_REQUEST',
        message: 'Max OTP request exceeded, Please try again next 1 hour',
        data: {},
      });
      return;
    }

    res.setHeader('X-Temporary-Token', result.token);
    res.json({
      error: false,
      code: 0,
      message: 'Success',
      data: {
        otp_code: result.otpCode,
      },
    });
  } catch (err) {
    console.error('OTP request failed:', err);
    sendInternalServerError(res);
  }
}
