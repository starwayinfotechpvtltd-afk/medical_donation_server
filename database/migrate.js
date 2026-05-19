import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,   // required to run full .sql files
};

const runFile = async (connection, filename) => {
  const filePath = resolve(__dirname, filename);
  const sql = readFileSync(filePath, 'utf8');
  console.log(`[MIGRATE] Running → ${filename}`);
  await connection.query(sql);
  console.log(`[MIGRATE] ✅ Done   → ${filename}`);
};

const migrate = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[MIGRATE] 🔗 Connected to MySQL');

    await runFile(connection, 'schema.sql');
    await runFile(connection, 'seed.sql');

    console.log('\n[MIGRATE] 🎉 All migrations completed successfully.');
  } catch (err) {
    console.error('[MIGRATE] ❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};
migrate();