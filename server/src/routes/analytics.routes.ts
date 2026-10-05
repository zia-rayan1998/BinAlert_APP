import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  categoryDistribution,
  cityStats,
  collectionEfficiency,
  distributionQuery,
  monthlySeries,
  rangeQuery,
  reportsByDay,
  weeklyActivity,
  zoneComparison,
} from '../controllers/analytics.controller.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/kpis', cityStats);
analyticsRouter.get('/monthly', validate(rangeQuery, 'query'), monthlySeries);
analyticsRouter.get('/zones', zoneComparison);
analyticsRouter.get('/weekly', weeklyActivity);
analyticsRouter.get('/categories', validate(distributionQuery, 'query'), categoryDistribution);
analyticsRouter.get('/reports-by-day', reportsByDay);
analyticsRouter.get('/collection-efficiency', collectionEfficiency);
