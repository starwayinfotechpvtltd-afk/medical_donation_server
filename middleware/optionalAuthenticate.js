import { verifyToken } from '../utils/jwt.js';
import { findById } from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { USER_STATUS } from '../config/constants.js';

const optionalAuthenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) return next();

    if (!authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authorization token is malformed.', 401, 'MALFORMED_TOKEN'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await findById(decoded.sub);

    if (!user) {
      return next(new AppError('User no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return next(new AppError('Your account is not active.', 403, 'ACCOUNT_NOT_ACTIVE'));
    }

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export default optionalAuthenticate;
