import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LEVELS, levelProgress } from '../utils/levels.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const leaderboardQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/** Badge catalogue annotated with whether the caller has earned each one. */
export const myBadges = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const [badges, earned] = await Promise.all([
    prisma.badge.findMany({ orderBy: { threshold: 'asc' } }),
    prisma.userBadge.findMany({ where: { userId: actor.id }, include: { badge: true } }),
  ]);

  const earnedById = new Map(earned.map((e) => [e.badgeId, e.awardedAt]));
  return res.json({
    badges: badges.map((b) => ({
      ...b,
      earnedAt: earnedById.get(b.id) ?? null,
      earned: earnedById.has(b.id),
    })),
    earnedCount: earned.length,
    total: badges.length,
  });
});

/** Top citizens by eco points. The caller is always included, with their rank. */
export const leaderboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit } = leaderboardQuery.parse(req.query);
  const actor = req.user!;

  const users = await prisma.user.findMany({
    where: { role: 'CITIZEN', isActive: true },
    select: { id: true, name: true, location: true, points: true, level: true },
    orderBy: [{ points: 'desc' }, { name: 'asc' }],
  });

  const ranked = users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    zone: u.location ?? 'Unassigned',
    points: u.points,
    level: u.level,
    isCurrentUser: u.id === actor.id,
  }));

  const myEntry = ranked.find((r) => r.id === actor.id) ?? null;
  const inTop = ranked.some((r) => r.id === actor.id);

  return res.json({
    items: ranked.slice(0, limit),
    me: inTop ? null : myEntry,
    totalParticipants: ranked.length,
  });
});

/** Current level, progress toward the next rung and lifetime totals. */
export const myProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { id: true, points: true, level: true, ecoScore: true },
  });

  const [reports, classifications, badges, co2] = await Promise.all([
    prisma.wasteReport.count({ where: { userId: user.id } }),
    prisma.wasteClassification.count({ where: { userId: user.id } }),
    prisma.userBadge.count({ where: { userId: user.id } }),
    prisma.wasteClassification.aggregate({
      where: { userId: user.id },
      _sum: { co2SavedKg: true, weightKg: true },
    }),
  ]);

  const progress = levelProgress(user.points);
  return res.json({
    points: user.points,
    level: progress.current,
    nextLevel: progress.next,
    progressPct: progress.progress,
    ecoScore: user.ecoScore,
    stats: {
      reports,
      classifications,
      badges,
      co2SavedKg: Number((co2._sum.co2SavedKg ?? 0).toFixed(1)),
      wasteSortedKg: Number((co2._sum.weightKg ?? 0).toFixed(1)),
    },
    ladder: LEVELS,
  });
});

export const pointsHistoryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** Point ledger for the caller, newest first. */
export const pointsHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = pointsHistoryQuery.parse(req.query);
  const actor = req.user!;

  const [total, items] = await prisma.$transaction([
    prisma.pointTransaction.count({ where: { userId: actor.id } }),
    prisma.pointTransaction.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return res.json({ items, total, page: q.page, pageSize: q.pageSize });
});
