import Joi from 'joi';
import { ROLES, USER_STATUS } from '../../config/constants.js';

export const updateUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).trim(),
  last_name: Joi.string().min(2).max(100).trim(),
  email: Joi.string().email().max(191).lowercase().trim(),
  phone: Joi.string().pattern(/^\+?[0-9\s\-(). ]{7,20}$/).allow('', null),
  role: Joi.string().valid(...Object.values(ROLES)),
  status: Joi.string().valid(...Object.values(USER_STATUS)),
  avatar_url: Joi.string().uri().max(500).allow('', null),
}).min(1);

export const doctorProfileSchema = Joi.object({
  specialization: Joi.string().min(2).max(150),
  qualification: Joi.string().max(255).allow('', null),
  license_number: Joi.string().max(100).allow('', null),
  years_of_experience: Joi.number().integer().min(0).max(70),
  consultation_fee: Joi.number().min(0).precision(2),
  available_days: Joi.string().max(100).allow('', null),
  available_time_start: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  available_time_end: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  image_url: Joi.string().uri().max(500).allow('', null),
  bio: Joi.string().max(2000).allow('', null),
}).min(1);
