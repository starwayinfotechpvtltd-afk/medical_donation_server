import morgan  from 'morgan';
import logger  from '../utils/logger.js';
import env     from '../config/env.js';

// Pipe morgan output into Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// ─── Dev: colourised one-liner ────────────────────────────────────────────────
// ─── Prod: JSON structured token format ──────────────────────────────────────
const format = env.IS_PROD
  ? ':remote-addr :method :url :status :res[content-length] :response-time ms'
  : 'dev';

const httpLogger = morgan(format, {
  stream,
  // Skip health-check noise in logs
  skip: (req) => req.originalUrl === '/api/health',
});

export default httpLogger;