const requestLogger = (req, _res, next) => {
  const { method, originalUrl, ip } = req;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${method} ${originalUrl} — IP: ${ip}`);

  next();
};

export default requestLogger;