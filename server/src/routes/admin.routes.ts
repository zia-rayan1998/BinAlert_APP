import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  auditQuery,
  createMunicipality,
  getUser,
  listAuditLogs,
  listMunicipalities,
  listUsers,
  listUsersQuery,
  platformStats,
  setUserRole,
  setUserRoleSchema,
  setUserStatus,
  setUserStatusSchema,
  updateMunicipality,
  upsertMunicipalitySchema,
} from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('SYSTEM_ADMIN'));

adminRouter.get('/stats', platformStats);
adminRouter.get('/users', validate(listUsersQuery, 'query'), listUsers);
adminRouter.get('/users/:id', getUser);
adminRouter.patch('/users/:id/role', validate(setUserRoleSchema), setUserRole);
adminRouter.patch('/users/:id/status', validate(setUserStatusSchema), setUserStatus);
adminRouter.get('/municipalities', listMunicipalities);
adminRouter.post('/municipalities', validate(upsertMunicipalitySchema), createMunicipality);
adminRouter.patch('/municipalities/:id', validate(upsertMunicipalitySchema.partial()), updateMunicipality);
adminRouter.get('/audit-logs', validate(auditQuery, 'query'), listAuditLogs);
