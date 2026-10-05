import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  citizenQuery,
  citizens,
  createRecyclingCenter,
  createRecyclingCenterSchema,
  createZone,
  createZoneSchema,
  deleteRecyclingCenter,
  kpis,
  listRecyclingCenters,
  listZones,
  myMunicipality,
  workers,
} from '../controllers/municipality.controller.js';

export const municipalityRouter = Router();

municipalityRouter.use(requireAuth, requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'));

municipalityRouter.get('/', myMunicipality);
municipalityRouter.get('/kpis', kpis);
municipalityRouter.get('/zones', listZones);
municipalityRouter.post('/zones', validate(createZoneSchema), createZone);
municipalityRouter.get('/citizens', validate(citizenQuery, 'query'), citizens);
municipalityRouter.get('/workers', workers);
municipalityRouter.get('/recycling-centers', listRecyclingCenters);
municipalityRouter.post('/recycling-centers', validate(createRecyclingCenterSchema), createRecyclingCenter);
municipalityRouter.delete('/recycling-centers/:id', deleteRecyclingCenter);
