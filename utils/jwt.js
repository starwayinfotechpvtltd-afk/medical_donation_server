import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from './AppError.js';

export const signToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    issuer: env.app.name,
    algorithm: 'HS256',
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.secret, {
      issuer: env.app.name,
      algorithms: ['HS256'],
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
  }
};

export const buildTokenPayload = (user) => ({
  sub: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
});