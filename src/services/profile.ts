import { sequelize } from '../config/database';
import { UserField } from '../constants/user';
import { ProfileDto } from '../dtos/profile';
import { User, UserModel } from '../models/user';

const PROFILE_ATTRIBUTES = [
  UserField.Id,
  UserField.PhoneNumber,
  UserField.Name,
];

export function profileData(user: UserModel): ProfileDto {
  return {
    id: user.getDataValue(UserField.Id),
    phone_number: user.getDataValue(UserField.PhoneNumber),
    name: user.getDataValue(UserField.Name),
  };
}

export async function findProfile(userId: number): Promise<UserModel | null> {
  return User.findByPk(userId, {
    attributes: PROFILE_ATTRIBUTES,
  });
}

export async function updateProfileName(userId: number, name: string): Promise<UserModel | null> {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      attributes: PROFILE_ATTRIBUTES,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) {
      return null;
    }
    await user.update({
      name,
    }, {
      transaction,
    });
    return user;
  });
}
