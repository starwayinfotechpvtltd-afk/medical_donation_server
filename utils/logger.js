import winston                from 'winston';
import DailyRotateFile        from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import env                    from '../config/env.js';

// Ensure log directory exists
if (!existsSync(env.log.dir)) mkdirSync(env.log.dir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// ─── Human-readable format for development ────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  })
);

// ─── Structured JSON format for production ────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ─── Rotating file transports ─────────────────────────────────────────────────
const fileTransportOptions = {
  dirname:       env.log.dir,
  datePattern:   'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles:      '30d',   // keep 30 days
};

const transports = [
  // All logs
  new DailyRotateFile({
    ...fileTransportOptions,
    filename:  'app-%DATE%.log',
    maxSize:   '20m',
  }),
  // Errors only — separate file for alerting
  new DailyRotateFile({
    ...fileTransportOptions,
    filename:  'error-%DATE%.log',
    level:     'error',
    maxSize:   '20m',
  }),
];

// Console only in non-production
if (!env.IS_PROD) {
  transports.push(
    new winston.transports.Console({ format: devFormat })
  );
}

const logger = winston.createLogger({
  level:       env.log.level,
  format:      env.IS_PROD ? prodFormat : devFormat,
  transports,
  // Don't crash on unhandled errors inside winston itself
  exitOnError: false,
});

export default logger;