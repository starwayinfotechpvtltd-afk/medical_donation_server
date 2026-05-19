import AppError from '../utils/AppError.js';

const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required.', 401, 'NOT_AUTHENTICATED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

export default authorize;