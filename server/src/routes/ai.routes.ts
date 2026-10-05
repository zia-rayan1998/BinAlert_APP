import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  forecast,
  forecastHistory,
  forecastHistoryQuery,
  forecastSchema,
  health,
  modelInfo,
  stats,
  statsQuery,
} from '../controllers/ai.controller.js';

export const aiRouter = Router();

// Status endpoints stay public so the frontend can decide between live
// inference and its labelled demo mode before anyone signs in.
aiRouter.get('/health', health);
aiRouter.get('/model-info', modelInfo);

aiRouter.post('/forecast', requireAuth, validate(forecastSchema), forecast);
aiRouter.get(
  '/forecasts',
  requireAuth,
  requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(forecastHistoryQuery, 'query'),
  forecastHistory,
);
aiRouter.get(
  '/stats',
  requireAuth,
  requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(statsQuery, 'query'),
  stats,
);
