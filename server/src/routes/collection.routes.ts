import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getRoute,
  getVehicle,
  listRoutes,
  listRuns,
  listRunsQuery,
  listVehicles,
  optimizeRoute,
  optimizeRouteSchema,
  updateRunStatus,
  updateRunStatusSchema,
  updateVehiclePosition,
} from '../controllers/collection.controller.js';

export const collectionRouter = Router();

collectionRouter.use(requireAuth);

collectionRouter.get('/vehicles', listVehicles);
collectionRouter.get('/vehicles/:plate', getVehicle);
collectionRouter.patch(
  '/vehicles/:plate',
  requireRole('WORKER', 'MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  updateVehiclePosition,
);

collectionRouter.get('/routes', listRoutes);
collectionRouter.get('/routes/:id', getRoute);
collectionRouter.post(
  '/routes/:id/optimize',
  requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(optimizeRouteSchema),
  optimizeRoute,
);

collectionRouter.get('/runs', validate(listRunsQuery, 'query'), listRuns);
collectionRouter.patch(
  '/runs/:reference',
  requireRole('WORKER', 'MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'),
  validate(updateRunStatusSchema),
  updateRunStatus,
);
