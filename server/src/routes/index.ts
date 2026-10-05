import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { aiRouter } from './ai.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { authRouter } from './auth.routes.js';
import { binRouter } from './bin.routes.js';
import { categoryRouter } from './category.routes.js';
import { classificationRouter } from './classification.routes.js';
import { collectionRouter } from './collection.routes.js';
import { gamificationRouter } from './gamification.routes.js';
import { municipalityRouter } from './municipality.routes.js';
import { notificationRouter } from './notification.routes.js';
import { reportRouter } from './report.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'binalert-api', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/classifications', classificationRouter);
apiRouter.use('/bins', binRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/collections', collectionRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/gamification', gamificationRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/municipality', municipalityRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/ai', aiRouter);
