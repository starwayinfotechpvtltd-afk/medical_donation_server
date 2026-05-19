import AppError from '../utils/AppError.js';

const VALID_ROUTES = [
  'oral','topical','intravenous','intramuscular',
  'subcutaneous','inhalation','other',
];

// ─── Create / Update Medical Record ──────────────────────────────────────────
const validateMedicalRecord = (body) => {
  const errors = [];

  if (!body.patient_id || isNaN(parseInt(body.patient_id, 10))) {
    errors.push({ field: 'patient_id', message: 'A valid patient_id is required.' });
  }

  if (!body.visit_date) {
    errors.push({ field: 'visit_date', message: 'visit_date is required.' });
  } else if (isNaN(new Date(body.visit_date).getTime())) {
    errors.push({ field: 'visit_date', message: 'visit_date must be a valid date.' });
  }

  // Vital signs: validate JSON shape if provided
  if (body.vital_signs !== undefined && body.vital_signs !== null) {
    const vs = typeof body.vital_signs === 'string'
      ? (() => { try { return JSON.parse(body.vital_signs); } catch { return null; } })()
      : body.vital_signs;

    if (vs === null || typeof vs !== 'object') {
      errors.push({ field: 'vital_signs', message: 'vital_signs must be a valid JSON object.' });
    }
  }

  return errors.length > 0 ? errors : null;
};

// ─── Add / Update Prescription ────────────────────────────────────────────────
const validatePrescription = (body) => {
  const errors = [];

  if (!body.medicine_name || body.medicine_name.trim().length < 2) {
    errors.push({ field: 'medicine_name', message: 'medicine_name is required (min 2 chars).' });
  }

  if (body.route !== undefined && !VALID_ROUTES.includes(body.route)) {
    errors.push({
      field: 'route',
      message: `route must be one of: ${VALID_ROUTES.join(', ')}.`,
    });
  }

  if (body.refills_allowed !== undefined) {
    const refills = parseInt(body.refills_allowed, 10);
    if (isNaN(refills) || refills < 0 || refills > 10) {
      errors.push({ field: 'refills_allowed', message: 'refills_allowed must be between 0 and 10.' });
    }
  }

  return errors.length > 0 ? errors : null;
};

// ─── Middleware Factory ───────────────────────────────────────────────────────
const validators = {
  medicalRecord:  validateMedicalRecord,
  prescription:   validatePrescription,
};

export const validate = (type) => (req, _res, next) => {
  const errors = validators[type]?.(req.body);
  if (errors) {
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};