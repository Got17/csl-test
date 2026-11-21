import { Request } from 'express';

export const messages = {
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
