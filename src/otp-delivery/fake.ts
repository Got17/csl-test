import { OtpDelivery, OtpDeliveryOutcome } from './otp-delivery';

export const fakeOtpDelivery: OtpDelivery = {
  async deliver(): Promise<OtpDeliveryOutcome> {
    return OtpDeliveryOutcome.Fake;
  },
};
