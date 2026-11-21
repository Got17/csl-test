import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface OtpAttributes {
  id: string;
  phone_number: string;
  otp_code: string;
  expires_at: Date;
  wrong_attempts: number;
  consumed_at: Date | null;
  invalidated_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type OtpCreationAttributes = Optional<
  OtpAttributes,
  'id' | 'wrong_attempts' | 'consumed_at' | 'invalidated_at' | 'createdAt' | 'updatedAt'
>;

export type OtpVerificationModel = Model<OtpAttributes, OtpCreationAttributes>;

export const OtpVerification = sequelize.define<OtpVerificationModel>('OtpVerification', {
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
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
  },
}, {
  tableName: 'otp_verifications',
  underscored: true,
});
