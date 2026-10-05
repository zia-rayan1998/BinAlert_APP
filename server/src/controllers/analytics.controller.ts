import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { WasteCategory } from '@prisma/client';

const CATEGORIES: WasteCategory[] = [
  'PLASTIC',
  'PAPER',
  'GLASS',
  'METAL',
  'ORGANIC',
  'E_WASTE',
  'MIXED',
  'OTHER',
];

export const rangeQuery = z.object({
  months: z.coerce.number().int().positive().max(24).default(12),
});

/** Month buckets, oldest first, e.g. `2026-10`. */
function monthBuckets(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Stacked monthly waste volumes by category, aggregated from stored
 * classifications. Months without data are emitted as zero so the chart's
 * x-axis stays continuous.
 */
export const monthlySeries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = rangeQuery.parse(req.query);
  const buckets = monthBuckets(q.months);
  const since = new Date();
  since.setMonth(since.getMonth() - q.months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.wasteClassification.findMany({
    where: { createdAt: { gte: since } },
    select: { category: true, weightKg: true, co2SavedKg: true, createdAt: true },
  });

  const empty = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<WasteCategory, number>;
  const byMonth = new Map<string, Record<WasteCategory, number>>(buckets.map((b) => [b, empty()]));
  const totals = empty();

  for (const row of rows) {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byMonth.get(key);
    if (bucket) bucket[row.category] += row.weightKg;
    totals[row.category] += row.weightKg;
  }

  const series = buckets.map((bucket) => {
    const perCategory = byMonth.get(bucket)!;
    return {
      month: bucket,
      totalKg: Number(CATEGORIES.reduce((acc, c) => acc + perCategory[c], 0).toFixed(1)),
      ...Object.fromEntries(CATEGORIES.map((c) => [c.toLowerCase(), Number(perCategory[c].toFixed(1))])),
    };
  });

  const grand = CATEGORIES.reduce((acc, c) => acc + totals[c], 0) || 1;
  return res.json({
    series,
    categories: CATEGORIES.map((c) => ({
      category: c,
      kg: Number(totals[c].toFixed(1)),
      sharePct: Number(((totals[c] / grand) * 100).toFixed(1)),
    })),
    since,
  });
});

/** Report volume per zone alongside the share that reached RESOLVED. */
export const zoneComparison = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } });

  const items = await Promise.all(
    zones.map(async (zone) => {
      const [total, resolved, classifications] = await Promise.all([
        prisma.wasteReport.count({ where: { zoneId: zone.id } }),
        prisma.wasteReport.count({ where: { zoneId: zone.id, status: 'RESOLVED' } }),
        prisma.wasteClassification.aggregate({
          where: { user: { municipalityId: zone.municipalityId } },
          _sum: { weightKg: true },
        }),
      ]);
      return {
        zone: zone.name,
        reports: total,
        resolved,
        resolutionPct: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
        wasteKg: Number((classifications._sum.weightKg ?? 0).toFixed(1)),
      };
    }),
  );

  return res.json({ items });
});

/** Report counts for the last 7 days, keyed by weekday label. */
export const weeklyActivity = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const items = await Promise.all(
    days.map(async (day, i) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const [reports, classifications] = await Promise.all([
        prisma.wasteReport.count({ where: { createdAt: { gte: day, lt: next } } }),
        prisma.wasteClassification.count({ where: { createdAt: { gte: day, lt: next } } }),
      ]);
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.toISOString(),
        reports,
        classifications,
        index: i,
      };
    }),
  );

  return res.json({ items });
});

export const distributionQuery = z.object({
  userId: z.string().optional(),
  scope: z.enum(['own', 'city']).default('city'),
});

/** Share of classified weight per waste category. */
export const categoryDistribution = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = distributionQuery.parse(req.query);
  const actor = req.user!;
  const isStaff = actor.role === 'MUNICIPALITY_ADMIN' || actor.role === 'SYSTEM_ADMIN';

  // Non-staff callers are always scoped to their own records.
  const scope: 'own' | 'city' = isStaff && q.scope === 'city' && !q.userId ? 'city' : 'own';
  const userId = q.userId ?? actor.id;

  const rows = await prisma.wasteClassification.groupBy({
    by: ['category'],
    where: scope === 'own' ? { userId } : undefined,
    _sum: { weightKg: true, co2SavedKg: true },
    _count: { _all: true },
  });

  const grand = rows.reduce((acc, r) => acc + (r._sum.weightKg ?? 0), 0) || 1;
  const items = CATEGORIES.map((c) => {
    const row = rows.find((r) => r.category === c);
    return {
      category: c,
      count: row?._count._all ?? 0,
      kg: Number((row?._sum.weightKg ?? 0).toFixed(1)),
      co2SavedKg: Number((row?._sum.co2SavedKg ?? 0).toFixed(1)),
      sharePct: Number((((row?._sum.weightKg ?? 0) / grand) * 100).toFixed(1)),
    };
  }).filter((i) => i.count > 0);

  return res.json({ items, scope, userId: scope === 'own' ? userId : undefined });
});

/** Daily report counts across the selected window, oldest first. */
export const reportsByDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = z.object({ days: z.coerce.number().int().positive().max(90).default(30) }).parse(req.query);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - q.days);

  const reports = await prisma.wasteReport.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const buckets = new Map<string, { date: string; submitted: number; resolved: number }>();
  for (let i = q.days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), {
      date: d.toISOString().slice(0, 10),
      submitted: 0,
      resolved: 0,
    });
  }
  for (const r of reports) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.submitted += 1;
    if (r.status === 'RESOLVED') bucket.resolved += 1;
  }

  return res.json({ items: [...buckets.values()] });
});

/** Fleet utilisation and on-time completion for collection runs. */
export const collectionEfficiency = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [total, completed, missed, inProgress, vehicles] = await Promise.all([
    prisma.collectionRun.count(),
    prisma.collectionRun.count({ where: { status: 'COMPLETED' } }),
    prisma.collectionRun.count({ where: { status: 'MISSED' } }),
    prisma.collectionRun.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.collectionVehicle.count({ where: { status: 'active' } }),
  ]);

  const finished = completed + missed;
  return res.json({
    completionPct: finished > 0 ? Number(((completed / finished) * 100).toFixed(1)) : 0,
    missedPct: finished > 0 ? Number(((missed / finished) * 100).toFixed(1)) : 0,
    runs: { total, completed, missed, inProgress },
    activeVehicles: vehicles,
  });
});

/** Raw city-wide aggregates used by the admin overview and public impact page. */
export const cityStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [
    reports,
    openReports,
    resolved,
    criticalBins,
    bins,
    classifications,
    weight,
    citizens,
    diverted,
  ] = await Promise.all([
    prisma.wasteReport.count(),
    prisma.wasteReport.count({ where: { status: { not: 'RESOLVED' } } }),
    prisma.wasteReport.count({ where: { status: 'RESOLVED' } }),
    prisma.bin.count({ where: { status: { in: ['HIGH', 'CRITICAL'] } } }),
    prisma.bin.count(),
    prisma.wasteClassification.count(),
    prisma.wasteClassification.aggregate({ _sum: { weightKg: true, co2SavedKg: true } }),
    prisma.user.count({ where: { role: 'CITIZEN', isActive: true } }),
    prisma.wasteClassification.aggregate({
      where: { category: { notIn: ['MIXED', 'OTHER'] } },
      _sum: { weightKg: true },
    }),
  ]);

  const totalKg = weight._sum.weightKg ?? 0;
  return res.json({
    reports,
    openReports,
    resolvedReports: resolved,
    resolutionPct: reports > 0 ? Number(((resolved / reports) * 100).toFixed(1)) : 0,
    criticalBins,
    bins,
    classifications,
    citizens,
    wasteKg: Number(totalKg.toFixed(1)),
    divertedKg: Number((diverted._sum.weightKg ?? 0).toFixed(1)),
    recyclingRatePct: totalKg > 0 ? Number((((diverted._sum.weightKg ?? 0) / totalKg) * 100).toFixed(1)) : 0,
    co2SavedKg: Number((weight._sum.co2SavedKg ?? 0).toFixed(1)),
  });
});
