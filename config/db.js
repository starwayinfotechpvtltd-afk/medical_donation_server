import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool(env.db);

const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`[DB] MySQL connected → ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (err) {
    console.error('[DB] MySQL connection failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

export { pool, testConnection };

// ─── Usage Example ──────────────────────────────────────────────────────────────

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};