import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { UserField } from '../constants/user';
import {
  ProfileImageMimeType,
  ProfileImageFormat,
  PROFILE_IMAGE_MAX_PIXELS,
  ProfileImageRoute,
  PROFILE_IMAGE_UPLOAD_DIRECTORY,
} from '../constants/profile-image';
import { User } from '../models/user';

const imageMimeTypes: Record<ProfileImageFormat, ProfileImageMimeType> = {
  [ProfileImageFormat.Jpeg]: ProfileImageMimeType.Jpeg,
  [ProfileImageFormat.Png]: ProfileImageMimeType.Png,
  [ProfileImageFormat.Webp]: ProfileImageMimeType.Webp,
};

function isProfileImageFormat(format: string | undefined): format is ProfileImageFormat {
  return format !== undefined && Object.values(ProfileImageFormat).includes(format as ProfileImageFormat);
}

export async function saveProfileImage(userId: number, image: Express.Multer.File): Promise<boolean> {
  let metadata: sharp.Metadata;
  let decodedImage: Buffer;
  try {
    const imageDecoder = sharp(image.buffer, {
      failOn: 'error',
      limitInputPixels: PROFILE_IMAGE_MAX_PIXELS,
    });
    metadata = await imageDecoder.metadata();
    decodedImage = await imageDecoder.rotate().toBuffer();
  } catch {
    return false;
  }

  const imageFormat = isProfileImageFormat(metadata.format) ? metadata.format : undefined;
  const mimeType = imageFormat ? imageMimeTypes[imageFormat] : undefined;
  if (!mimeType || mimeType !== image.mimetype) {
    return false;
  }

  const uploadDirectory = path.resolve(PROFILE_IMAGE_UPLOAD_DIRECTORY);
  const filename = `${randomUUID()}.${imageFormat}`;
  const imagePath = path.join(uploadDirectory, filename);
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(imagePath, decodedImage, { flag: 'wx' });

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      await unlink(imagePath);
      return false;
    }
    const previousUrl = user.getDataValue(UserField.ImageUrl);
    await user.update({
      [UserField.ImageUrl]: `${ProfileImageRoute.PublicPath}/${filename}`,
    });
    if (previousUrl) {
      const previousFilename = path.basename(previousUrl);
      if (previousFilename !== filename) {
        await unlink(path.join(uploadDirectory, previousFilename)).catch(() => undefined);
      }
    }
    return true;
  } catch (error) {
    await unlink(imagePath).catch(() => undefined);
    throw error;
  }
}
