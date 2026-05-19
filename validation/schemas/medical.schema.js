import Joi from 'joi';

const VALID_ROUTES = [
  'oral','topical','intravenous','intramuscular',
  'subcutaneous','inhalation','other',
];

export const medicalRecordSchema = Joi.object({
  patient_id:     Joi.number().integer().positive().required(),
  appointment_id: Joi.number().integer().positive().allow(null),
  visit_date:     Joi.date().iso().max('now').required(),
  chief_complaint:Joi.string().max(1000).allow('', null),
  diagnosis:      Joi.string().max(2000).allow('', null),
  treatment_plan: Joi.string().max(2000).allow('', null),
  vital_signs:    Joi.object({
    bp:         Joi.string().max(20).allow('', null),
    pulse:      Joi.number().min(0).max(300).allow(null),
    temp:       Joi.number().min(90).max(115).allow(null),
    weight_kg:  Joi.number().min(0).max(500).allow(null),
    height_cm:  Joi.number().min(0).max(300).allow(null),
    spo2:       Joi.number().min(0).max(100).allow(null),
  }).allow(null),
  follow_up_date: Joi.date().iso().greater('now').allow(null),
  is_confidential:Joi.boolean().default(false),
});

export const prescriptionSchema = Joi.object({
  medicine_name:  Joi.string().min(2).max(255).trim().required(),
  dosage:         Joi.string().max(100).allow('', null),
  frequency:      Joi.string().max(100).allow('', null),
  duration:       Joi.string().max(100).allow('', null),
  route:          Joi.string().valid(...VALID_ROUTES).default('oral'),
  instructions:   Joi.string().max(1000).allow('', null),
  refills_allowed:Joi.number().integer().min(0).max(10).default(0),
  is_active:      Joi.boolean(),
});