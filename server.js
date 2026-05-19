import 'dotenv/config';

import app from './app.js';
import env from './config/env.js';
import { testConnection } from './config/db.js';

const startServer = async () => {
  await testConnection();

  const server = app.listen(env.PORT, () => {
    console.log(`[SERVER] 🚀 ${env.app.name} running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[SERVER] Health: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal) => {
    console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('[SERVER] HTTP server closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[SERVER] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
    shutdown('unhandledRejection');
  });
};

startServer();