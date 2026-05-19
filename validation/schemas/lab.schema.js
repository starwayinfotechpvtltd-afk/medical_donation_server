import Joi from 'joi';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'rejected'];

export const createLabSchema = Joi.object({
  patient_id: Joi.number().integer().positive(),
  patient_reg_no: Joi.string().trim().max(40),
  test_name: Joi.string().min(2).max(255).trim().required(),
  test_type: Joi.string().max(100).allow('', null),
  category: Joi.string().valid('hematology', 'biochemistry', 'microbiology', 'immunology', 'radiology', 'cardiology', 'pathology', 'other').default('other'),
  priority: Joi.string().valid('routine', 'urgent', 'stat').default('routine'),
  appointment_id: Joi.number().integer().positive().allow(null),
  medical_record_id: Joi.number().integer().positive().allow(null),
  notes: Joi.string().max(1000).allow('', null),
}).or('patient_id', 'patient_reg_no');

export const updateLabSchema = Joi.object({
  test_name: Joi.string().min(2).max(255).trim(),
  test_type: Joi.string().max(100).allow('', null),
  appointment_id: Joi.number().integer().positive().allow(null),
  medical_record_id: Joi.number().integer().positive().allow(null),
  notes: Joi.string().max(1000).allow('', null),
  is_critical: Joi.boolean(),
}).min(1);

export const labStatusSchema = Joi.object({
  status: Joi.string().valid(...VALID_STATUSES).required(),
  notes: Joi.string().max(1000).allow('', null),
});
