import Joi from 'joi';
import { ROLES } from '../../config/constants.js';

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.pattern.name': 'Password must contain at least one {#name}.',
    'string.min':          'Password must be at least 8 characters.',
  });

export const registerSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).trim().required(),
  last_name:  Joi.string().min(2).max(100).trim().required(),
  email:      Joi.string().email().max(191).lowercase().trim().required(),
  password:   password.required(),
  role:       Joi.string().valid(...Object.values(ROLES)).required(),
  phone:      Joi.string().pattern(/^\+?[0-9\s\-(). ]{7,20}$/).optional().allow('', null),
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

export const doctorRequestOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

export const doctorVerifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

export const doctorSetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: password.required(),
});

export const labTechRequestOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

export const labTechVerifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

export const labTechSetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: password.required(),
});

