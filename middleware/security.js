import helmet from 'helmet';
import cors   from 'cors';
import env    from '../config/env.js';

// ─── Helmet ───────────────────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  // Prevent MIME-type sniffing
  contentTypeOptions: true,
  // Block pages from being framed (clickjacking)
  frameguard: { action: 'deny' },
  // HSTS — force HTTPS (only in production)
  hsts: env.IS_PROD
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  // Disable X-Powered-By to hide Express fingerprint
  hidePoweredBy: true,
  // XSS filter for older browsers
  xssFilter: true,
  // Restrict referrer info
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  // Allow frontend on a different origin (e.g. localhost:3000) to load /uploads assets
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) or whitelisted origins
    if (!origin || env.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin "${origin}" is not allowed.`));
    }
  },
  methods:            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:     ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders:     ['X-Request-ID', 'X-RateLimit-Remaining'],
  credentials:        true,
  maxAge:             86400,   // preflight cache: 24 hours
  optionsSuccessStatus: 200,
});
