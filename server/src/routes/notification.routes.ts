import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  broadcast,
  broadcastSchema,
  clearRead,
  deleteNotification,
  listNotifications,
  listQuery,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', validate(listQuery, 'query'), listNotifications);
notificationRouter.post('/read-all', markAllRead);
notificationRouter.delete('/read', clearRead);
notificationRouter.patch('/:id/read', markRead);
notificationRouter.delete('/:id', deleteNotification);
notificationRouter.post(
  '/broadcast',
  requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(broadcastSchema),
  broadcast,
);
