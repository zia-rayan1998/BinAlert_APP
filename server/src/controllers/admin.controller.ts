import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';
import { kebab, serializeUser, toPrismaRole, toRole } from '../utils/serialize.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Prisma } from '@prisma/client';

const roles = ['citizen', 'worker', 'municipality', 'admin'] as const;

export const listUsersQuery = z.object({
  role: z.enum(roles).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  location: true,
  avatarHue: true,
  isActive: true,
  points: true,
  level: true,
  ecoScore: true,
  createdAt: true,
  municipalityId: true,
} satisfies Prisma.UserSelect;

export const listUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = listUsersQuery.parse(req.query);

  const where: Prisma.UserWhereInput = {
    ...(q.role ? { role: toPrismaRole(q.role) } : {}),
    ...(q.status ? { isActive: q.status === 'active' } : {}),
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: 'insensitive' } },
            { email: { contains: q.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, items, byRole] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: publicUser,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
  ]);

  return res.json({
    items: items.map((u) => serializeUser(u)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    counts: Object.fromEntries(byRole.map((r) => [toRole(r.role), r._count._all])),
  });
});

export const getUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { ...publicUser, municipality: { select: { id: true, name: true } } },
  });
  if (!user) throw notFound('That user does not exist.');

  const [reports, classifications, badges] = await Promise.all([
    prisma.wasteReport.count({ where: { userId: user.id } }),
    prisma.wasteClassification.count({ where: { userId: user.id } }),
    prisma.userBadge.findMany({ where: { userId: user.id }, include: { badge: true } }),
  ]);

  return res.json({ user: serializeUser(user), stats: { reports, classifications, badges: badges.length } });
});

export const setUserRoleSchema = z.object({ role: z.enum(roles) });

export const setUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { role } = setUserRoleSchema.parse(req.body);
  const actor = req.user!;

  if (actor.id === req.params.id && role !== 'admin') {
    throw badRequest('You cannot remove your own system administrator role.');
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicUser });
  if (!target) throw notFound('That user does not exist.');

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { role: toPrismaRole(role) },
    select: publicUser,
  });

  await writeAudit({
    actor,
    action: 'user.role_changed',
    target: `${target.email}: ${toRole(target.role)} → ${role}`,
    ipAddress: req.ip,
  });
  return res.json({ user: serializeUser(user) });
});

export const setUserStatusSchema = z.object({ isActive: z.boolean() });

export const setUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { isActive } = setUserStatusSchema.parse(req.body);
  const actor = req.user!;

  if (actor.id === req.params.id && !isActive) {
    throw badRequest('You cannot suspend your own account.');
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicUser });
  if (!target) throw notFound('That user does not exist.');

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { isActive },
    select: publicUser,
  });

  await writeAudit({
    actor,
    action: isActive ? 'user.reactivated' : 'user.suspended',
    target: target.email,
    ipAddress: req.ip,
  });
  return res.json({ user: serializeUser(user) });
});

export const listMunicipalities = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.municipality.findMany({
    include: { _count: { select: { users: true, zones: true, bins: true, routes: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ items });
});

export const upsertMunicipalitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(120),
  plan: z.enum(['Starter', 'Professional', 'Enterprise']).default('Starter'),
  status: z.enum(['trial', 'active', 'suspended']).default('trial'),
  population: z.coerce.number().int().nonnegative().default(0),
  recyclingRate: z.coerce.number().min(0).max(100).default(0),
  contactEmail: z.string().trim().email().max(160).optional(),
});

export const createMunicipality = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = upsertMunicipalitySchema.parse(req.body);
  const actor = req.user!;

  const municipality = await prisma.municipality.create({ data: input });
  await writeAudit({ actor, action: 'municipality.created', target: municipality.name, ipAddress: req.ip });
  return res.status(201).json({ municipality });
});

export const updateMunicipality = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = upsertMunicipalitySchema.partial().parse(req.body);
  const actor = req.user!;

  const municipality = await prisma.municipality.update({ where: { id: req.params.id }, data: input });
  await writeAudit({ actor, action: 'municipality.updated', target: municipality.name, ipAddress: req.ip });
  return res.json({ municipality });
});

export const auditQuery = z.object({
  action: z.string().trim().max(80).optional(),
  actor: z.string().trim().max(160).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

/** Immutable audit trail. Read-only — entries are never edited or deleted. */
export const listAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = auditQuery.parse(req.query);

  const where: Prisma.AuditLogWhereInput = {
    ...(q.action ? { action: { contains: q.action, mode: 'insensitive' } } : {}),
    ...(q.actor ? { actorEmail: { contains: q.actor, mode: 'insensitive' } } : {}),
    ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return res.json({ items, total, page: q.page, pageSize: q.pageSize });
});

/** Platform-wide health snapshot for the admin overview. */
export const platformStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [users, reports, classifications, bins, municipalities, recentAudit, points] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.wasteReport.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.wasteClassification.aggregate({ _count: { _all: true }, _sum: { weightKg: true, co2SavedKg: true } }),
    prisma.bin.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.municipality.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.pointTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  return res.json({
    users: Object.fromEntries(users.map((u) => [toRole(u.role), u._count._all])),
    reports: Object.fromEntries(reports.map((r) => [kebab(r.status), r._count._all])),
    bins: Object.fromEntries(bins.map((b) => [kebab(b.status), b._count._all])),
    classifications: classifications._count._all,
    wasteKg: Number((classifications._sum.weightKg ?? 0).toFixed(1)),
    co2SavedKg: Number((classifications._sum.co2SavedKg ?? 0).toFixed(1)),
    municipalities,
    auditEvents24h: recentAudit,
    pointsAwarded: points._sum.amount ?? 0,
  });
});
