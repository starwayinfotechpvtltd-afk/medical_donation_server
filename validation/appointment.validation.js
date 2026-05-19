import AppError from '../utils/AppError.js';

const VALID_TYPES = ['in_person', 'teleconsultation'];
const VALID_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
const VALID_DURATIONS = [15, 30, 45, 60, 90, 120];

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v);

const validateBook = (body) => {
  const errors = [];

  if (!body.doctor_profile_id || isNaN(parseInt(body.doctor_profile_id, 10))) {
    errors.push({ field: 'doctor_profile_id', message: 'A valid doctor_profile_id is required.' });
  }

  if (!body.department_id || isNaN(parseInt(body.department_id, 10))) {
    errors.push({ field: 'department_id', message: 'A valid department_id is required.' });
  }

  if (!body.scheduled_date || !isDate(body.scheduled_date)) {
    errors.push({ field: 'scheduled_date', message: 'scheduled_date must be YYYY-MM-DD.' });
  }

  if (!body.scheduled_time || !isTime(body.scheduled_time)) {
    errors.push({ field: 'scheduled_time', message: 'scheduled_time must be HH:MM or HH:MM:SS.' });
  }

  if (body.duration_minutes !== undefined) {
    const dur = parseInt(body.duration_minutes, 10);
    if (!VALID_DURATIONS.includes(dur)) {
      errors.push({ field: 'duration_minutes', message: `duration_minutes must be one of: ${VALID_DURATIONS.join(', ')}.` });
    }
  }

  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    errors.push({ field: 'type', message: `type must be one of: ${VALID_TYPES.join(', ')}.` });
  }

  return errors.length > 0 ? errors : null;
};

const validateStatusUpdate = (body) => {
  const errors = [];

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    errors.push({ field: 'status', message: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  if (body.status === 'cancelled' && (!body.cancellation_reason || body.cancellation_reason.trim().length < 5)) {
    errors.push({ field: 'cancellation_reason', message: 'cancellation_reason is required when cancelling (min 5 chars).' });
  }

  return errors.length > 0 ? errors : null;
};

const validateReschedule = (body) => {
  const errors = [];

  if (!body.scheduled_date || !isDate(body.scheduled_date)) {
    errors.push({ field: 'scheduled_date', message: 'scheduled_date must be YYYY-MM-DD.' });
  }

  if (!body.scheduled_time || !isTime(body.scheduled_time)) {
    errors.push({ field: 'scheduled_time', message: 'scheduled_time must be HH:MM or HH:MM:SS.' });
  }

  if (body.duration_minutes !== undefined) {
    const dur = parseInt(body.duration_minutes, 10);
    if (!VALID_DURATIONS.includes(dur)) {
      errors.push({ field: 'duration_minutes', message: `duration_minutes must be one of: ${VALID_DURATIONS.join(', ')}.` });
    }
  }

  return errors.length > 0 ? errors : null;
};

const validators = {
  book: validateBook,
  statusUpdate: validateStatusUpdate,
  reschedule: validateReschedule,
};

export const validate = (type) => (req, _res, next) => {
  const errors = validators[type]?.(req.body);
  if (errors) {
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};
