import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';
import {
  classify,
  listClassifications,
  listQuerySchema,
  myTotals,
} from '../controllers/classification.controller.js';

export const classificationRouter = Router();

classificationRouter.use(requireAuth);

classificationRouter.post('/', uploadImage, classify);
classificationRouter.get('/', validate(listQuerySchema, 'query'), listClassifications);
classificationRouter.get('/totals', myTotals);
