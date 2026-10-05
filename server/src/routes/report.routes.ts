import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  addReportNote,
  assignReport,
  createReport,
  createReportSchema,
  deleteReport,
  getReport,
  listQuerySchema,
  listReports,
  setReportPriority,
  updateReportStatus,
} from '../controllers/report.controller.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get('/', validate(listQuerySchema, 'query'), listReports);
reportRouter.post('/', validate(createReportSchema), createReport);
reportRouter.get('/:reference', getReport);
reportRouter.delete('/:reference', deleteReport);

reportRouter.post('/:reference/assign', requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'), assignReport);
reportRouter.patch('/:reference/status', updateReportStatus);
reportRouter.patch('/:reference/priority', requireRole('MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN'), setReportPriority);
reportRouter.post('/:reference/notes', addReportNote);
