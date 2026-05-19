import { createAuditLog } from '../models/admin.model.js';

/**
 * Factory that returns an Express middleware which writes
 * an audit log entry AFTER the response is sent.
 *
 * Usage:
 *   router.post('/users', audit('USER_CREATED', 'users'), ctrl.create);
 *
 * @param {string} action      - e.g. 'USER_CREATED'
 * @param {string} entity_type - e.g. 'users'
 */
const audit = (action, entity_type = null) => (req, res, next) => {
  // Hook into finish event — non-blocking, after response is sent
  res.on('finish', () => {
    const success = res.statusCode < 400;
    createAuditLog({
      actor_id:    req.user?.sub   || null,
      actor_role:  req.user?.role  || null,
      action,
      entity_type,
      entity_id:   req.params?.id  ? parseInt(req.params.id, 10) : null,
      ip_address:  req.ip          || null,
      user_agent:  req.headers['user-agent'] || null,
      status:      success ? 'success' : 'failure',
      meta: {
        method: req.method,
        path:   req.originalUrl,
        status_code: res.statusCode,
      },
    }).catch((err) =>
      console.error('[AUDIT] Failed to write audit log:', err.message)
    );
  });
  next();
};

export default audit;