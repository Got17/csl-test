import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';

export async function lockPhoneNumber(phoneNumber: string, transaction: Transaction): Promise<void> {
  await sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:phone, 0))', {
    replacements: {
      phone: phoneNumber,
    },
    transaction,
  });
}
