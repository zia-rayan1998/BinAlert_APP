import { prisma } from '../lib/prisma.js';
import { levelFor } from '../utils/levels.js';
import type { User } from '@prisma/client';

/**
 * Awards eco points, keeps `level` in sync with the ladder and records the
 * transaction. Every point-affecting flow goes through here so the rules stay
 * in one place.
 */
export async function awardPoints(userId: string, amount: number, reason: string): Promise<User> {
  if (!Number.isFinite(amount) || amount === 0) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  const [, user] = await prisma.$transaction([
    prisma.pointTransaction.create({ data: { userId, amount, reason } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: amount },
        ecoScore: amount > 0 ? { increment: 1 } : undefined,
      },
    }),
  ]);

  const level = levelFor(user.points).level;
  return level === user.level ? user : prisma.user.update({ where: { id: userId }, data: { level } });
}

/**
 * Grants a badge once. Returns the created row, or null when the user already
 * holds it — badges are never duplicated and never revoked here.
 */
export async function grantBadge(userId: string, badgeKey: string) {
  const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
  if (!badge) return null;

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return null;

  const awarded = await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT',
      title: `Badge unlocked — ${badge.name}`,
      body: badge.description,
      link: '/eco-points',
    },
  });
  return { ...awarded, badge };
}

/** Threshold-based badges derived from lifetime counts. Keys match `seed.ts`. */
export async function evaluateBadges(userId: string): Promise<string[]> {
  const [reports, resolvedRoadside, classifications, recyclable, user] = await Promise.all([
    prisma.wasteReport.count({ where: { userId } }),
    prisma.wasteReport.count({ where: { userId, type: 'ROADSIDE_WASTE', status: 'RESOLVED' } }),
    prisma.wasteClassification.count({ where: { userId } }),
    prisma.wasteClassification.count({ where: { userId, category: { notIn: ['MIXED', 'OTHER'] } } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { points: true } }),
  ]);

  const candidates: [string, boolean][] = [
    ['first-report', reports >= 1],
    ['sorting-hero', classifications >= 10],
    ['recycling-champion', recyclable >= 25],
    ['clean-street', resolvedRoadside >= 5],
    ['eco-warrior', user.points >= 2000],
  ];

  const awarded: string[] = [];
  for (const [key, earned] of candidates) {
    if (!earned) continue;
    const result = await grantBadge(userId, key);
    if (result) awarded.push(key);
  }
  return awarded;
}
