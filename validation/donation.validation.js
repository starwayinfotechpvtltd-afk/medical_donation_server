import AppError from '../utils/AppError.js';

const VALID_STATUSES  = ['draft','active','paused','completed','cancelled'];
const VALID_METHODS   = ['credit_card','debit_card','upi','net_banking','cash','bank_transfer','other'];
const VALID_CURRENCIES = ['INR','USD','EUR','GBP'];

const validateCampaign = (body) => {
  const errors = [];

  if (!body.title || body.title.trim().length < 3)
    errors.push({ field: 'title', message: 'title is required (min 3 chars).' });

  if (!body.goal_amount || isNaN(parseFloat(body.goal_amount)) || parseFloat(body.goal_amount) <= 0)
    errors.push({ field: 'goal_amount', message: 'goal_amount must be a positive number.' });

  if (body.status && !VALID_STATUSES.includes(body.status))
    errors.push({ field: 'status', message: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

  if (body.start_date && body.end_date && new Date(body.start_date) >= new Date(body.end_date))
    errors.push({ field: 'end_date', message: 'end_date must be after start_date.' });

  return errors.length ? errors : null;
};

const validateDonate = (body) => {
  const errors = [];

  if (!body.amount || isNaN(parseFloat(body.amount)) || parseFloat(body.amount) <= 0)
    errors.push({ field: 'amount', message: 'amount must be a positive number.' });

  if (body.payment_method && !VALID_METHODS.includes(body.payment_method))
    errors.push({ field: 'payment_method', message: `payment_method must be one of: ${VALID_METHODS.join(', ')}.` });

  if (body.currency && !VALID_CURRENCIES.includes(body.currency))
    errors.push({ field: 'currency', message: `currency must be one of: ${VALID_CURRENCIES.join(', ')}.` });

  if (!body.donor_name || String(body.donor_name).trim().length < 2)
    errors.push({ field: 'donor_name', message: 'donor_name is required (min 2 chars).' });

  if (!body.donor_email || !String(body.donor_email).includes('@'))
    errors.push({ field: 'donor_email', message: 'donor_email is required and must be a valid email.' });

  if (!body.donor_phone || String(body.donor_phone).trim().length < 7)
    errors.push({ field: 'donor_phone', message: 'donor_phone is required.' });

  return errors.length ? errors : null;
};

export const validate = (type) => (req, _res, next) => {
  const validators = { campaign: validateCampaign, donate: validateDonate };
  const errors = validators[type]?.(req.body);
  if (errors) return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  next();
};
