import { Router } from 'express';
import { pool } from '../config/db.js';
import { sendSuccess } from '../utils/response.js';
import env from '../config/env.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    const dbOk = rows[0]?.result === 2;

    return sendSuccess(res, {
      message: 'System operational',
      data: {
        app: env.app.name,
        environment: env.NODE_ENV,
        server: 'ok',
        database: dbOk ? 'ok' : 'unreachable',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;