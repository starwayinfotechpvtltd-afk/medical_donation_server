import { ROLES } from '../config/constants.js';
import AppError from '../utils/AppError.js';

const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const isStrongPassword = (str) => str && str.length >= 8;

const validateRegister = (body) => {
  const errors = [];

  if (!body.first_name || body.first_name.trim().length < 2) {
    errors.push({ field: 'first_name', message: 'First name must be at least 2 characters.' });
  }

  if (!body.last_name || body.last_name.trim().length < 2) {
    errors.push({ field: 'last_name', message: 'Last name must be at least 2 characters.' });
  }

  if (!body.email || !isEmail(body.email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!body.password || !isStrongPassword(body.password)) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  }

  if (!body.role || !Object.values(ROLES).includes(body.role)) {
    errors.push({
      field: 'role',
      message: `Role must be one of: ${Object.values(ROLES).join(', ')}.`,
    });
  }

  return errors.length > 0 ? errors : null;
};

const validateLogin = (body) => {
  const errors = [];

  if (!body.email || !isEmail(body.email)) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!body.password || body.password.trim().length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  return errors.length > 0 ? errors : null;
};

export const validate = (type) => (req, _res, next) => {
  const validators = { register: validateRegister, login: validateLogin };
  const errors = validators[type](req.body);

  if (errors) {
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};