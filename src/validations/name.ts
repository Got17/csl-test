import Joi from 'joi';

const MAX_NAME_LENGTH = 100;

export const nameSchema = Joi.string().trim().max(MAX_NAME_LENGTH).required();
