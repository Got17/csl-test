export enum ProfileImageMimeType {
  Jpeg = 'image/jpeg',
  Png = 'image/png',
  Webp = 'image/webp',
}

export enum ProfileImageFormat {
  Jpeg = 'jpeg',
  Png = 'png',
  Webp = 'webp',
}

export enum ProfileImageRoute {
  Upload = '/me/image',
  PublicPath = '/uploads',
}

export enum ProfileImageFormField {
  File = 'image',
}

export const PROFILE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_PIXELS = 20_000_000;
export const DEFAULT_PROFILE_IMAGE_UPLOAD_DIRECTORY = 'uploads';
export const PROFILE_IMAGE_UPLOAD_DIRECTORY = process.env.UPLOAD_DIRECTORY || DEFAULT_PROFILE_IMAGE_UPLOAD_DIRECTORY;
