export interface UpdateProfileDto {
  name: string;
}

export interface ProfileDto {
  id: number;
  phone_number: string;
  name: string;
  image_url: string | null;
}
