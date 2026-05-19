import { pool } from '../config/db.js';

export const logActivity = async (db, {
  actorType = 'system',
  actorId = null,
  action,
  description = null,
  entityType = null,
  entityId = null,
  req = null,
  details = null,
} = {}) => {
  if (!action) return;

  const sql = `INSERT INTO activity_logs
    (actor_type, actor_id, action, description, entity_type, entity_id, ip_address, user_agent, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`;

  const ipAddress = req?.ip || null;
  const userAgent = req?.headers?.['user-agent'] || null;
  const detailsText = details ? JSON.stringify(details) : null;

  await db.query(sql, [
    actorType,
    actorId,
    action,
    description,
    entityType,
    entityId,
    ipAddress,
    userAgent,
    detailsText,
  ]);
};

export const fireAndForgetActivity = (params) => {
  logActivity(pool, params).catch(console.error);
};
