export enum AuthAction {
  Register = 'register',
  Login = 'login',
}

export enum TokenPurpose {
  Otp = 'otp',
  Access = 'access',
}

export enum AuthError {
  InvalidOtp = 'invalid_otp',
  MaxAttempt = 'max_attempt',
  UserExists = 'user_exists',
  UserNotFound = 'user_not_found',
}

export const AUTHORIZATION_HEADER = 'Authorization';
export const BEARER_TOKEN_PATTERN = /^Bearer\s+(\S+)$/i;
export const JWT_ALGORITHM = 'HS256';
