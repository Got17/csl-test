import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export const OtpVerification = sequelize.define<Model>('OtpVerification', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  phone_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  otp_code: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  wrong_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invalidated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'otp_verifications',
  underscored: true,
});
