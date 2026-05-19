import { ROLES, USER_STATUS } from '../config/constants.js';
import AppError from '../utils/AppError.js';

const VALID_ROLES = Object.values(ROLES);
const VALID_STATUSES = Object.values(USER_STATUS);

const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const isPhone = (str) => /^\+?[0-9\s\-().]{7,20}$/.test(str);
const isURL = (str) => {
  try { new URL(str); return true; } catch { return false; }
};

const validateUpdateUser = (body) => {
  const errors = [];

  if (body.first_name !== undefined && body.first_name.trim().length < 2) {
    errors.push({ field: 'first_name', message: 'First name must be at least 2 characters.' });
  }

  if (body.last_name !== undefined && body.last_name.trim().length < 2) {
    errors.push({ field: 'last_name', message: 'Last name must be at least 2 characters.' });
  }

  if (body.email !== undefined && !isEmail(body.email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (body.phone !== undefined && body.phone && !isPhone(body.phone)) {
    errors.push({ field: 'phone', message: 'Phone number format is invalid.' });
  }

  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    errors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  if (body.avatar_url !== undefined && body.avatar_url && !isURL(body.avatar_url)) {
    errors.push({ field: 'avatar_url', message: 'avatar_url must be a valid URL.' });
  }

  return errors.length > 0 ? errors : null;
};

const validateDoctorProfile = (body) => {
  const errors = [];

  if (body.specialization !== undefined && body.specialization.trim().length < 2) {
    errors.push({ field: 'specialization', message: 'Specialization must be at least 2 characters.' });
  }

  if (body.consultation_fee !== undefined) {
    const fee = parseFloat(body.consultation_fee);
    if (isNaN(fee) || fee < 0) {
      errors.push({ field: 'consultation_fee', message: 'Consultation fee must be a positive number.' });
    }
  }

  if (body.years_of_experience !== undefined) {
    const exp = parseInt(body.years_of_experience, 10);
    if (isNaN(exp) || exp < 0 || exp > 70) {
      errors.push({ field: 'years_of_experience', message: 'Years of experience must be between 0 and 70.' });
    }
  }

  if (body.available_time_start !== undefined && body.available_time_end !== undefined) {
    const start = body.available_time_start;
    const end = body.available_time_end;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      errors.push({ field: 'available_time', message: 'Times must be in HH:MM format (24hr).' });
    } else if (start >= end) {
      errors.push({ field: 'available_time', message: 'Start time must be before end time.' });
    }
  }

  if (body.image_url !== undefined && body.image_url && !isURL(body.image_url)) {
    errors.push({ field: 'image_url', message: 'image_url must be a valid URL.' });
  }

  return errors.length > 0 ? errors : null;
};

const validate = (type) => (req, _res, next) => {
  const validators = {
    updateUser: validateUpdateUser,
    doctorProfile: validateDoctorProfile,
  };

  const errors = validators[type]?.(req.body);
  if (errors) {
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};

export { validate };
