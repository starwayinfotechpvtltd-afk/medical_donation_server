import rateLimit from 'express-rate-limit';
import env       from '../config/env.js';
import logger    from '../utils/logger.js';

const { windowMs, max, authMax } = env.rateLimit;

// ─── Shared handler for limit exceeded ───────────────────────────────────────
const onLimitReached = (req, _res, options) => {
  logger.warn('[RATE LIMIT] Limit exceeded', {
    ip:     req.ip,
    path:   req.originalUrl,
    method: req.method,
  });
};

// ─── Global API limiter ───────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,    // RateLimit-* headers (RFC 6585)
  legacyHeaders:   false,   // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: `Too many requests. Please try again after ${windowMs / 60000} minutes.`,
    code:    'RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json(options.message);
  },
});

// ─── Strict limiter for auth endpoints ───────────────────────────────────────
// Prevents brute-force on login / register
export const authLimiter = rateLimit({
  windowMs,
  max:             authMax,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code:    'AUTH_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, next, options) => {
    logger.warn('[RATE LIMIT] Auth limit exceeded', {
      ip:    req.ip,
      email: req.body?.email || 'unknown',
    });
    res.status(429).json(options.message);
  },
  skipSuccessfulRequests: true,   // only count failed attempts
});

// ─── Upload limiter — prevent upload spam ────────────────────────────────────
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Upload limit reached. Please try again later.',
    code:    'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});