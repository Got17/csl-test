import { Request } from 'express';

export const messages = {
  success: {
    en: 'Success',
    lo: 'ສຳເລັດ',
  },
  badRequest: {
    en: 'Bad Request',
    lo: 'ຄຳຮ້ອງຂໍບໍ່ຖືກຕ້ອງ',
  },
  internalServerError: {
    en: 'Internal Server Error',
    lo: 'ເກີດຂໍ້ຜິດພາດພາຍໃນເຊີບເວີ',
  },
  otpMaxRequest: {
    en: 'Max OTP request exceeded, Please try again next 1 hour',
    lo: 'ຂໍລະຫັດ OTP ເກີນຈຳນວນທີ່ກຳນົດ ກະລຸນາລອງໃໝ່ຫຼັງຈາກ 1 ຊົ່ວໂມງ',
  },
  otpMaxAttempt: {
    en: 'Wrong OTP attempted exceeded, Please request new OTP instead',
    lo: 'ປ້ອນລະຫັດ OTP ຜິດເກີນຈຳນວນທີ່ກຳນົດ ກະລຸນາຂໍລະຫັດ OTP ໃໝ່',
  },
  invalidOtp: {
    en: 'Invalid or expired OTP',
    lo: 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ',
  },
  invalidTemporaryToken: {
    en: 'Invalid or missing temporary token',
    lo: 'ໂທເຄັນຊົ່ວຄາວບໍ່ຖືກຕ້ອງ ຫຼື ບໍ່ມີໂທເຄັນ',
  },
  userAlreadyExists: {
    en: 'User already exists',
    lo: 'ມີຜູ້ໃຊ້ນີ້ແລ້ວ',
  },
  userNotFound: {
    en: 'User not found',
    lo: 'ບໍ່ພົບຜູ້ໃຊ້',
  },
  invalidUserId: {
    en: 'User ID is invalid',
    lo: 'ລະຫັດຜູ້ໃຊ້ບໍ່ຖືກຕ້ອງ',
  },
  invalidAccessTokenConfiguration: {
    en: 'JWT_SECRET and a valid ACCESS_TOKEN_TTL_SECONDS are required',
    lo: 'ຕ້ອງກຳນົດ JWT_SECRET ແລະ ACCESS_TOKEN_TTL_SECONDS ໃຫ້ຖືກຕ້ອງ',
  },
  authenticationFailed: {
    en: 'Authentication failed:',
    lo: 'ການຢືນຢັນຕົວຕົນບໍ່ສຳເລັດ:',
  },
  invalidJwtConfiguration: {
    en: 'JWT_SECRET and a valid TEMP_TOKEN_TTL_SECONDS are required',
    lo: 'ຕ້ອງກຳນົດ JWT_SECRET ແລະ TEMP_TOKEN_TTL_SECONDS ໃຫ້ຖືກຕ້ອງ',
  },
  otpRequestFailed: {
    en: 'OTP request failed:',
    lo: 'ຂໍລະຫັດ OTP ບໍ່ສຳເລັດ:',
  },
  requestFailed: {
    en: 'Request failed:',
    lo: 'ຄຳຮ້ອງຂໍບໍ່ສຳເລັດ:',
  },
  databaseConnectionFailed: {
    en: 'Failed to connect to the database:',
    lo: 'ເຊື່ອມຕໍ່ຖານຂໍ້ມູນບໍ່ສຳເລັດ:',
  },
} as const;

export function requestMessage(req: Request, key: keyof typeof messages): string {
  const language = req.acceptsLanguages('en', 'lo') === 'lo' ? 'lo' : 'en';
  return messages[key][language];
}
