export enum LogLevel {
  Info = 'info',
  Error = 'error',
}

export enum LogEvent {
  RequestCompleted = 'http_request_completed',
  ServerStarted = 'server_started',
  DatabaseConnectionFailed = 'database_connection_failed',
  RequestFailed = 'request_failed',
  OtpDeliveryFailed = 'otp_delivery_failed',
  OtpRequestFailed = 'otp_request_failed',
  AuthenticationFailed = 'authentication_failed',
  ProfileRequestFailed = 'profile_request_failed',
  MissingJwtSecret = 'missing_jwt_secret',
}

export enum LogHeader {
  RequestId = 'X-Request-Id',
}
