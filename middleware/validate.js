import AppError from '../utils/AppError.js';

/**
 * Joi validation middleware factory.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @param {'body'|'query'|'params'}   target  - Which part of req to validate
 *
 * Usage:
 *   import { loginSchema } from '../validations/schemas/auth.schema.js';
 *   router.post('/login', validate(loginSchema), ctrl.login);
 */
const validate = (schema, target = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly:       false,   // collect ALL errors, not just first
    allowUnknown:     false,   // reject unknown keys
    stripUnknown:     true,    // remove unknown keys silently
    convert:          true,    // coerce types (string → number etc.)
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(new AppError('Validation failed.', 422, 'VALIDATION_ERROR', errors));
  }

  // Replace req[target] with the cleaned, coerced value
  req[target] = value;
  next();
};

export default validate;