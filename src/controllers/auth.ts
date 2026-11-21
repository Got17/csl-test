import { Request, Response } from 'express';
import Joi from 'joi';
import { ErrorCode } from '../constants/error-code';
import { PHONE_NUMBER_PATTERN, ValidationErrorType } from '../constants/validation';
import { RequestOtpDto } from '../dtos/auth';
import { issueOtp } from '../services/otp';
import { sendBadRequest, sendInternalServerError } from '../utils/error-response';
import { messages, requestMessage } from '../utils/message';

const requestSchema = Joi.object<RequestOtpDto>({
  phone_number: Joi.string().trim().pattern(PHONE_NUMBER_PATTERN).required(),
}).unknown(false).required();

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { error, value } = requestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const unknownField = error.details.some((detail) => detail.type === ValidationErrorType.UnknownField);
    sendBadRequest(res, unknownField ? ErrorCode.ValidationUnknownField : ErrorCode.ValidationInvalidField);
    return;
  }

  try {
    const result = await issueOtp(value.phone_number);
    if (!result) {
      res.vary('Accept-Language');
      res.status(429).json({
        error: true,
        code: ErrorCode.OtpMaxRequest,
        message: requestMessage(req, 'otpMaxRequest'),
        data: {},
      });
      return;
    }

    res.setHeader('X-Temporary-Token', result.token);
    res.json({
      error: false,
      code: 0,
      message: messages.success.en,
      data: {
        otp_code: result.otpCode,
      },
    });
  } catch (err) {
    console.error(messages.otpRequestFailed.en, err);
    sendInternalServerError(res);
  }
}
