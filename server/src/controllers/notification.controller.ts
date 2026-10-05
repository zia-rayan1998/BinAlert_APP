import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/errors.js';
import { serializeNotification, toPrismaEnum } from '../utils/serialize.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { NotificationType } from '@prisma/client';

const TYPES = [
  'report-submitted',
  'report-assigned',
  'status-changed',
  'resolved',
  'collection',
  'achievement',
  'points',
] as const;

export const listQuery = z.object({
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(false),
  type: z.enum(TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});

export const listNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = listQuery.parse(req.query);
  const actor = req.user!;

  const where = {
    userId: actor.id,
    ...(q.unreadOnly ? { read: false } : {}),
    ...(q.type ? { type: toPrismaEnum<NotificationType>(q.type) } : {}),
  };

  const [total, unread, items] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return res.json({ items: items.map(serializeNotification), total, unread, page: q.page, pageSize: q.pageSize });
});

export const markRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: actor.id },
  });
  if (!notification) throw notFound('Notification not found.');

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  return res.json({ notification: serializeNotification(updated) });
});

export const markAllRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { count } = await prisma.notification.updateMany({
    where: { userId: actor.id, read: false },
    data: { read: true },
  });
  return res.json({ updated: count });
});

export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  await prisma.notification.deleteMany({ where: { id: req.params.id, userId: actor.id } });
  return res.json({ ok: true });
});

export const clearRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { count } = await prisma.notification.deleteMany({ where: { userId: actor.id, read: true } });
  return res.json({ deleted: count });
});

/**
 * Broadcasts an operational notification to every active citizen.
 * Restricted to municipal staff — this is what powers the "notify residents"
 * action on the municipality dashboard.
 */
export const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(500),
  type: z.enum(TYPES).default('collection'),
  link: z.string().trim().max(300).optional(),
  zone: z.string().trim().max(120).optional(),
});

export const broadcast = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = broadcastSchema.parse(req.body);

  const recipients = await prisma.user.findMany({
    where: {
      role: 'CITIZEN',
      isActive: true,
      ...(input.zone ? { location: { contains: input.zone, mode: 'insensitive' } } : {}),
    },
    select: { id: true },
  });

  if (recipients.length === 0) return res.json({ delivered: 0, recipients: 0 });

  const { count } = await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: toPrismaEnum<NotificationType>(input.type),
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    })),
  });

  return res.status(201).json({ delivered: count, recipients: recipients.length, zone: input.zone ?? 'all' });
});
