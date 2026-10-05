import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

async function main() {
  try {
    await prisma.$connect();
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('\n[db] Could not reach PostgreSQL at the configured DATABASE_URL.');
    console.error('     Start the database, then run:  npm run prisma:migrate  and  npm run db:seed');
    console.error(`     ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[api] BinAlert API listening on http://localhost:${env.PORT}`);
    console.log(`[api] Environment: ${env.NODE_ENV}`);
    console.log(`[api] CORS origins: ${env.corsOrigins.join(', ')}`);
    console.log(
      env.AI_SERVICE_URL
        ? `[ai]  Inference service: ${env.AI_SERVICE_URL}`
        : '[ai]  Inference service not configured — /api/ai/* will report demo mode',
    );
  });

  const shutdown = (signal: string) => {
    console.log(`\n[api] ${signal} received, shutting down…`);
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main();
