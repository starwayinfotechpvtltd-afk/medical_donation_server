import AppError from '../utils/AppError.js';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'rejected'];

const validateCreate = (body) => {
  const errors = [];

  const hasPatientId = body.patient_id && !isNaN(parseInt(body.patient_id, 10));
  const hasPatientRegNo = typeof body.patient_reg_no === 'string' && body.patient_reg_no.trim().length > 0;
  if (!hasPatientId && !hasPatientRegNo) {
    errors.push({ field: 'patient_reg_no', message: 'A valid patient_reg_no (or patient_id) is required.' });
  }

  if (!body.test_name || body.test_name.trim().length < 2) {
    errors.push({ field: 'test_name', message: 'test_name is required (min 2 chars).' });
  }

  if (body.appointment_id !== undefined && isNaN(parseInt(body.appointment_id, 10))) {
    errors.push({ field: 'appointment_id', message: 'appointment_id must be a valid integer.' });
  }

  if (body.medical_record_id !== undefined && isNaN(parseInt(body.medical_record_id, 10))) {
    errors.push({ field: 'medical_record_id', message: 'medical_record_id must be a valid integer.' });
  }

  return errors.length > 0 ? errors : null;
};

const validateStatusUpdate = (body) => {
  const errors = [];

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    errors.push({ field: 'status', message: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  return errors.length > 0 ? errors : null;
};

const validateUpdate = (body) => {
  const errors = [];

  if (body.test_name !== undefined && body.test_name.trim().length < 2) {
    errors.push({ field: 'test_name', message: 'test_name must be at least 2 characters.' });
  }

  if (body.is_critical !== undefined && ![0, 1, true, false, '0', '1'].includes(body.is_critical)) {
    errors.push({ field: 'is_critical', message: 'is_critical must be a boolean.' });
  }

  return errors.length > 0 ? errors : null;
};

const validators = {
  create: validateCreate,
  statusUpdate: validateStatusUpdate,
  update: validateUpdate,
};

export const validate = (type) => (req, _res, next) => {
  const errors = validators[type]?.(req.body);
  if (errors) {
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};
