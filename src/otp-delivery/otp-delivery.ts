export enum OtpDeliveryOutcome {
  Fake = 'fake',
  Delivered = 'delivered',
}

export interface OtpDelivery {
  deliver(phoneNumber: string, otpCode: string): Promise<OtpDeliveryOutcome>;
}
