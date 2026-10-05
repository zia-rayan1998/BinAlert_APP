import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { binSummary, getBin, listBins, listBinsQuery, updateBin, updateBinSchema } from '../controllers/bin.controller.js';

export const binRouter = Router();

binRouter.use(requireAuth);

binRouter.get('/', validate(listBinsQuery, 'query'), listBins);
binRouter.get('/summary', binSummary);
binRouter.get('/:code', getBin);
binRouter.patch(
  '/:code',
  requireRole('WORKER', 'MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(updateBinSchema),
  updateBin,
);
