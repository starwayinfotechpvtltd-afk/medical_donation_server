import Joi from 'joi';

const VALID_TYPES = ['in_person', 'teleconsultation'];
const VALID_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
const VALID_DURATIONS = [15, 30, 45, 60, 90, 120];

export const bookAppointmentSchema = Joi.object({
  doctor_profile_id: Joi.number().integer().positive().required(),
  department_id: Joi.number().integer().positive().required(),
  scheduled_date: Joi.date().iso().required(),
  scheduled_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required(),
  duration_minutes: Joi.number().valid(...VALID_DURATIONS).default(30),
  type: Joi.string().valid(...VALID_TYPES).default('in_person'),
  disease: Joi.string().max(255).allow('', null),
  reason: Joi.string().max(1000).required(),
  notes: Joi.string().max(2000).allow('', null),
});

export const statusUpdateSchema = Joi.object({
  status: Joi.string().valid(...VALID_STATUSES).required(),
  notes: Joi.string().max(2000).allow('', null),
  cancellation_reason: Joi.when('status', {
    is: 'cancelled',
    then: Joi.string().min(5).max(500).required(),
    otherwise: Joi.string().allow('', null),
  }),
});

export const rescheduleSchema = Joi.object({
  scheduled_date: Joi.date().iso().required(),
  scheduled_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required(),
  duration_minutes: Joi.number().valid(...VALID_DURATIONS),
});
