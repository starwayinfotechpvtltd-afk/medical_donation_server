import logger      from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import env         from '../config/env.js';

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let code       = err.code       || 'INTERNAL_ERROR';
  const errors   = err.errors     || null;

  // ── MySQL errors ──────────────────────────────────────────────
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409; message = 'Duplicate entry. Resource already exists.'; code = 'DUPLICATE_ENTRY';
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400; message = 'Referenced resource does not exist.'; code = 'INVALID_REFERENCE';
  }

  // ── JWT errors ────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401; message = 'Invalid token.'; code = 'INVALID_TOKEN';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401; message = 'Token expired.'; code = 'TOKEN_EXPIRED';
  }

  // ── CORS error ────────────────────────────────────────────────
  if (err.message?.includes('CORS policy')) {
    statusCode = 403; code = 'CORS_BLOCKED';
  }

  // ── Structured logging ────────────────────────────────────────
  const logPayload = {
    requestId:  req.requestId,
    method:     req.method,
    path:       req.originalUrl,
    ip:         req.ip,
    statusCode,
    code,
    stack:      err.stack,
  };

  if (statusCode >= 500) {
    logger.error(message, logPayload);
  } else if (statusCode >= 400) {
    logger.warn(message, logPayload);
  }

  // Hide internals in production
  if (env.IS_PROD && statusCode >= 500) {
    message = 'Something went wrong. Please try again later.';
  }

  return sendError(res, { statusCode, message, code, errors });
};

export default errorHandler;