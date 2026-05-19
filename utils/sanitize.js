/**
 * Strip sensitive fields before sending user objects in responses.
 * Always run user records through this before returning to client.
 */

const SENSITIVE_FIELDS = ['password', 'password_reset_token', 'password_reset_expires'];

export const sanitizeUser = (user) => {
  if (!user) return null;
  const safe = { ...user };
  SENSITIVE_FIELDS.forEach((field) => delete safe[field]);
  return safe;
};

/**
 * Sanitize an array of users.
 */
export const sanitizeUsers = (users = []) => users.map(sanitizeUser);