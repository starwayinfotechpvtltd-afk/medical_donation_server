export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendError = (res, { statusCode = 500, message = 'Internal Server Error', code = null, errors = null } = {}) => {
  const payload = { success: false, message };
  if (code) payload.code = code;
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};