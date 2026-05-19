import 'dotenv/config';

/**
 * Required ENV variables
 * (DB_PASSWORD intentionally optional for local MySQL)
 */
const required = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
];

/**
 * Check only undefined / missing values
 * Allows empty string like DB_PASSWORD=
 */
const missing = required.filter(
  (key) => process.env[key] === undefined
);

if (missing.length) {
  console.error(`[CONFIG] Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  IS_PROD: process.env.NODE_ENV === 'production',

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    waitForConnections: true,
    queueLimit: 0,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  app: {
    name: process.env.APP_NAME || 'HospitalMS',
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || process.env.APP_NAME || 'HospitalMS',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  rateLimit: {
    windowMs:
      Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max:
      Number(process.env.RATE_LIMIT_MAX) || 100,
    authMax:
      Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};

export default config;
