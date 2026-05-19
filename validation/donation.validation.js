// donation.validation.js
// The 400 error was most likely caused by a validation schema
// that required donor_name / donor_email / donor_phone.
// Only `amount` is truly required — all donor fields are optional.

import AppError from '../utils/AppError.js';

const ALLOWED_PAYMENT_METHODS = [
  'credit_card', 'debit_card', 'upi', 'net_banking', 'cash', 'bank_transfer', 'other',
];

const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

export const validate = (type) => (req, res, next) => {
  if (type === 'donate') {
    const {
      amount,
      currency = 'INR',
      payment_method = 'other',
      donor_email,
    } = req.body;

    // --- amount (only truly required field) ---
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError('A valid donation amount is required.', 400, 'VALIDATION_ERROR'));
    }

    // --- currency (optional, validated if provided) ---
    if (currency && !ALLOWED_CURRENCIES.includes(currency)) {
      return next(new AppError(`Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}.`, 400, 'VALIDATION_ERROR'));
    }

    // --- payment_method (optional, validated if provided) ---
    if (payment_method && !ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return next(new AppError(`payment_method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`, 400, 'VALIDATION_ERROR'));
    }

    // --- donor_email (optional, basic format check if provided) ---
    if (donor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(donor_email).trim())) {
      return next(new AppError('Please provide a valid email address.', 400, 'VALIDATION_ERROR'));
    }
  }

  next();
};