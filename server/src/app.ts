import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';
import { uploadRoot } from './middleware/upload.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // Uploaded report/classification images, served read-only.
  app.use('/uploads', express.static(uploadRoot, { fallthrough: true, maxAge: '1h' }));

  app.use('/api', apiLimiter, attachUser, apiRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'BinAlert API',
      version: '1.0.0',
      docs: '/api/health',
      ai: env.AI_SERVICE_URL ? 'configured' : 'not configured (clients fall back to demo inference)',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
