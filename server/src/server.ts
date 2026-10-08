import 'dotenv/config';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function startServer() {
  const config = loadConfig();
  const app = await buildApp(config);

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error({ err: error }, 'Unable to start backend server');
    await app.close();
    process.exitCode = 1;
    return;
  }

  let isClosing = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (isClosing) return;
    isClosing = true;
    app.log.info({ signal }, 'Closing backend server');
    await app.close();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void startServer().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown startup error.';
  process.stderr.write(`Backend startup failed: ${message}\n`);
  process.exitCode = 1;
});
