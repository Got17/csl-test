export const PHONE_NUMBER_PATTERN = /^\d{8,15}$/;

export enum ValidationErrorType {
  UnknownField = 'object.unknown',
}

export enum MultipartErrorCode {
  FieldCount = 'LIMIT_FIELD_COUNT',
  PartCount = 'LIMIT_PART_COUNT',
}

export enum BodyParserErrorType {
  PayloadTooLarge = 'entity.too.large',
}
