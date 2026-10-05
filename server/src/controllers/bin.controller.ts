import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';
import { kebab, serializeBin, toCategory, toPrismaEnum } from '../utils/serialize.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { BinStatus, Prisma, WasteCategory } from '@prisma/client';

const binStatuses = ['normal', 'attention', 'high', 'critical'] as const;

export const listBinsQuery = z.object({
  zone: z.string().optional(),
  status: z.enum(binStatuses).optional(),
});

export const updateBinSchema = z.object({
  status: z.enum(binStatuses),
  fillLevel: z.coerce.number().int().min(0).max(100).optional(),
});

export const listBins = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = req.query as unknown as z.infer<typeof listBinsQuery>;
  const where: Prisma.BinWhereInput = {
    ...(q.status ? { status: toPrismaEnum<BinStatus>(q.status) } : {}),
    ...(q.zone ? { zone: { name: { contains: q.zone, mode: 'insensitive' } } } : {}),
  };
  const bins = await prisma.bin.findMany({
    where,
    include: { zone: { select: { id: true, name: true } } },
    orderBy: [{ fillLevel: 'desc' }, { code: 'asc' }],
  });
  return res.json({ items: bins.map(serializeBin), total: bins.length });
});

export const getBin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bin = await prisma.bin.findUnique({
    where: { code: req.params.code },
    include: { zone: { select: { id: true, name: true } }, statusHistory: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!bin) throw notFound('That bin does not exist.');

  const { statusHistory, ...rest } = bin;
  return res.json({
    bin: serializeBin(rest),
    history: statusHistory.map((h) => ({
      status: kebab(h.status),
      fillLevel: h.fillLevel,
      at: h.createdAt.toISOString(),
    })),
  });
});

export const updateBin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof updateBinSchema>;
  const actor = req.user!;
  const status = toPrismaEnum<BinStatus>(input.status);

  const existing = await prisma.bin.findUnique({ where: { code: req.params.code } });
  if (!existing) throw notFound('That bin does not exist.');

  const collected = status === 'NORMAL';
  const fillLevel = input.fillLevel ?? (collected ? 5 : existing.fillLevel);

  const bin = await prisma.$transaction(async (tx) => {
    const updated = await tx.bin.update({
      where: { id: existing.id },
      data: { status, fillLevel, lastCollectedAt: collected ? new Date() : existing.lastCollectedAt },
      include: { zone: { select: { id: true, name: true } } },
    });
    await tx.binStatusEvent.create({ data: { binId: updated.id, status: updated.status, fillLevel } });
    return updated;
  });

  await writeAudit({
    actor,
    action: collected ? 'bin.collected' : 'bin.escalated',
    target: `${bin.code} → ${kebab(bin.status)}`,
    ipAddress: req.ip,
  });

  return res.json({ bin: serializeBin(bin) });
});

export const binSummary = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const grouped = await prisma.bin.groupBy({ by: ['status'], _count: { _all: true } });
  const avg = await prisma.bin.aggregate({ _avg: { fillLevel: true } });

  const byStatus = Object.fromEntries(grouped.map((g) => [kebab(g.status), g._count._all]));
  return res.json({
    total: grouped.reduce((s, g) => s + g._count._all, 0),
    byStatus,
    averageFillLevel: Math.round(avg._avg.fillLevel ?? 0),
  });
});

export const listCategories = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const categories = await prisma.wasteCategoryDef.findMany({ orderBy: { label: 'asc' } });
  return res.json({
    items: categories.map((c) => ({
      id: c.id,
      category: toCategory(c.category),
      label: c.label,
      recommendedBin: c.recommendedBin,
      binColor: c.binColor,
      tip: c.environmentalTip,
      isActive: c.isActive,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
});

export const setCategoryActive = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ isActive: z.boolean() });
  const { isActive } = schema.parse(req.body);
  const actor = req.user!;

  const category = await prisma.wasteCategoryDef.update({
    where: { category: toPrismaEnum<WasteCategory>(req.params.category) },
    data: { isActive },
  });

  await writeAudit({
    actor,
    action: isActive ? 'category.enabled' : 'category.disabled',
    target: category.label,
    ipAddress: req.ip,
  });

  return res.json({
    category: {
      id: category.id,
      category: toCategory(category.category),
      label: category.label,
      isActive: category.isActive,
      updatedAt: category.updatedAt.toISOString(),
    },
  });
});
