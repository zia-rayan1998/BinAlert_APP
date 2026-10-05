import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listCategories, setCategoryActive } from '../controllers/bin.controller.js';

export const categoryRouter = Router();

categoryRouter.get('/', requireAuth, listCategories);
categoryRouter.patch('/:category', requireRole('SYSTEM_ADMIN'), setCategoryActive);
