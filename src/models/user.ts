import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserAttributes {
  id: number;
  phone_number: string;
  name: string;
  image_url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export type UserModel = Model<UserAttributes, UserCreationAttributes>;

export const User = sequelize.define<UserModel>('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  phone_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(2048),
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
  tableName: 'users',
  underscored: true,
});
