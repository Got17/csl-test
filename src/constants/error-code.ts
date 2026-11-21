export enum ErrorCode {
  ValidationUnknownField = 'VALIDATION_ERR_UNKNOWN_FIELD',
  ValidationInvalidField = 'VALIDATION_ERR_INVALID_FIELD',
  InternalServerError = 'INTERNAL_SERVER_ERROR',
  OtpMaxRequest = 'OTP_ERR_MAX_REQUEST',
  OtpInvalid = 'OTP_ERR_INVALID',
  OtpMaxAttempt = 'OTP_ERR_MAX_ATTEMPT',
  InvalidToken = 'AUTH_ERR_INVALID_TOKEN',
  UserAlreadyExists = 'USER_ERR_ALREADY_EXISTS',
  UserNotFound = 'USER_ERR_NOT_FOUND',
}
