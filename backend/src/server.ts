import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  await connectDatabase();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'ERP API started');
  });
}

startServer().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Unable to start ERP API');
  process.exitCode = 1;
});