import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  leaderboard,
  leaderboardQuery,
  myBadges,
  myProgress,
  pointsHistory,
  pointsHistoryQuery,
} from '../controllers/gamification.controller.js';

export const gamificationRouter = Router();

gamificationRouter.use(requireAuth);

gamificationRouter.get('/me', myProgress);
gamificationRouter.get('/badges', myBadges);
gamificationRouter.get('/points', validate(pointsHistoryQuery, 'query'), pointsHistory);
gamificationRouter.get('/leaderboard', validate(leaderboardQuery, 'query'), leaderboard);
