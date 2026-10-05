import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Headline KPIs in the exact shape the municipality dashboard renders.
 * Everything here is derived from stored records — nothing is invented.
 */
export const kpis = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [totalReports, activeReports, resolvedReports, overflowingBins, runs, weight, diverted] = await Promise.all([
    prisma.wasteReport.count(),
    prisma.wasteReport.count({ where: { status: { not: 'RESOLVED' } } }),
    prisma.wasteReport.count({ where: { status: 'RESOLVED' } }),
    prisma.bin.count({ where: { status: { in: ['HIGH', 'CRITICAL'] } } }),
    prisma.collectionRun.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.wasteClassification.aggregate({ _sum: { weightKg: true } }),
    prisma.wasteClassification.aggregate({
      where: { category: { notIn: ['MIXED', 'OTHER'] } },
      _sum: { weightKg: true },
    }),
  ]);

  const completed = runs.find((r) => r.status === 'COMPLETED')?._count._all ?? 0;
  const missed = runs.find((r) => r.status === 'MISSED')?._count._all ?? 0;
  const finished = completed + missed;

  const totalKg = weight._sum.weightKg ?? 0;
  const divertedKg = diverted._sum.weightKg ?? 0;

  return res.json({
    totalReports,
    activeReports,
    resolvedReports,
    overflowingBins,
    collectionEfficiency: finished > 0 ? Number(((completed / finished) * 100).toFixed(1)) : 0,
    recyclingRate: totalKg > 0 ? Number(((divertedKg / totalKg) * 100).toFixed(1)) : 0,
    wasteDivertedKg: Number(divertedKg.toFixed(1)),
    landfillReductionPct: totalKg > 0 ? Number(((divertedKg / totalKg) * 100).toFixed(1)) : 0,
  });
});

export const listZones = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const zones = await prisma.zone.findMany({
    include: { _count: { select: { bins: true, reports: true, routes: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ zones });
});

export const createZoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  municipalityId: z.string().min(1),
});

export const createZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = createZoneSchema.parse(req.body);
  const actor = req.user!;

  const zone = await prisma.zone.create({ data: input });
  await writeAudit({ actor, action: 'zone.created', target: zone.name, ipAddress: req.ip });
  return res.status(201).json({ zone });
});

export const citizenQuery = z.object({
  zone: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

/** Registered residents with their engagement totals, most active first. */
export const citizens = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = citizenQuery.parse(req.query);

  const users = await prisma.user.findMany({
    where: {
      role: 'CITIZEN',
      isActive: true,
      ...(q.zone ? { location: { contains: q.zone, mode: 'insensitive' } } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      location: true,
      points: true,
      level: true,
      ecoScore: true,
      createdAt: true,
      _count: { select: { reports: true, classifications: true } },
    },
    orderBy: [{ points: 'desc' }, { name: 'asc' }],
    skip: (q.page - 1) * q.pageSize,
    take: q.pageSize,
  });

  return res.json({
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      zone: u.location ?? 'Unassigned',
      reports: u._count.reports,
      classifications: u._count.classifications,
      points: u.points,
      level: u.level,
      ecoScore: u.ecoScore,
      joinedAt: u.createdAt.toISOString(),
    })),
    page: q.page,
    pageSize: q.pageSize,
  });
});

/**
 * Collection crews with their current open load — the picker used when
 * assigning a report to a worker.
 */
export const workers = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'WORKER', isActive: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  });

  const items = await Promise.all(
    users.map(async (w) => {
      const openLoad = await prisma.wasteReport.count({
        where: { assignedWorkerId: w.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      });
      const onRoute = await prisma.collectionRun.count({
        where: { status: 'IN_PROGRESS', vehicle: { driver: w.name } },
      });
      return {
        id: w.id,
        name: w.name,
        zone: w.location ?? 'Unassigned',
        openLoad,
        // Shift state is inferred from live work; the schema has no roster.
        status: onRoute > 0 ? 'on-route' : 'available',
      };
    }),
  );

  return res.json({ items });
});

export const listRecyclingCenters = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const centers = await prisma.recyclingCenter.findMany({ orderBy: { name: 'asc' } });
  return res.json({
    items: centers.map((c) => ({
      id: c.id,
      name: c.name,
      zone: c.zone,
      lat: c.latitude,
      lng: c.longitude,
      accepts: c.accepts,
      throughputKgDay: c.throughputKgDay,
    })),
  });
});

export const createRecyclingCenterSchema = z.object({
  name: z.string().trim().min(2).max(160),
  zone: z.string().trim().min(2).max(120),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accepts: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  throughputKgDay: z.coerce.number().int().nonnegative().default(0),
});

export const createRecyclingCenter = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = createRecyclingCenterSchema.parse(req.body);
  const actor = req.user!;

  const center = await prisma.recyclingCenter.create({ data: input });
  await writeAudit({ actor, action: 'recycling_center.created', target: center.name, ipAddress: req.ip });
  return res.status(201).json({ center });
});

export const deleteRecyclingCenter = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const center = await prisma.recyclingCenter.findUnique({ where: { id: req.params.id } });
  if (!center) throw notFound('That facility does not exist.');

  await prisma.recyclingCenter.delete({ where: { id: center.id } });
  await writeAudit({ actor, action: 'recycling_center.deleted', target: center.name, ipAddress: req.ip });
  return res.json({ ok: true });
});

/** Municipality tenant record for the signed-in staff member. */
export const myMunicipality = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  if (!actor.municipalityId) {
    return res.json({ municipality: null });
  }

  const municipality = await prisma.municipality.findUnique({
    where: { id: actor.municipalityId },
    include: {
      _count: { select: { users: true, zones: true, bins: true, routes: true } },
      zones: { orderBy: { name: 'asc' } },
    },
  });
  return res.json({ municipality });
});
