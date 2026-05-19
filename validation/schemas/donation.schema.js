import Joi from 'joi';

const VALID_STATUSES  = ['draft','active','paused','completed','cancelled'];
const VALID_METHODS   = ['credit_card','debit_card','upi','net_banking','cash','bank_transfer','other'];
const VALID_CURRENCIES = ['INR','USD','EUR','GBP'];

export const campaignSchema = Joi.object({
  title:        Joi.string().min(3).max(255).trim().required(),
  description:  Joi.string().max(2000).allow('', null),
  goal_amount:  Joi.number().positive().precision(2).required(),
  currency:     Joi.string().valid(...VALID_CURRENCIES).default('INR'),
  status:       Joi.string().valid(...VALID_STATUSES),
  start_date:   Joi.date().iso().allow(null),
  end_date:     Joi.date().iso().greater(Joi.ref('start_date')).allow(null)
                  .messages({ 'date.greater': 'end_date must be after start_date.' }),
  thumbnail_url:Joi.string().uri().max(500).allow('', null),
  is_featured:  Joi.boolean().default(false),
});

export const donateSchema = Joi.object({
  amount:        Joi.number().positive().precision(2).required(),
  currency:      Joi.string().valid(...VALID_CURRENCIES).default('INR'),
  payment_method:Joi.string().valid(...VALID_METHODS).default('other'),
  donor_name:    Joi.string().min(2).max(150).required(),
  donor_email:   Joi.string().email().max(191).required(),
  donor_phone:   Joi.string().min(7).max(20).required(),
  donor_pan:     Joi.string().max(20).allow('', null),
  donor_address: Joi.string().max(500).allow('', null),
  is_anonymous:  Joi.boolean().default(false),
  donor_message: Joi.string().max(500).allow('', null),
});
