export interface RequestOtpDto {
  phone_number: string;
}

export interface RegisterDto {
  otp_code: string;
  name: string;
}

export interface LoginDto {
  otp_code: string;
}
