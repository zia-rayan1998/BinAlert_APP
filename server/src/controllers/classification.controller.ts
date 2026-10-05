import { readFile } from 'node:fs/promises';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, serviceUnavailable } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { aiClient } from '../services/aiClient.js';
import { awardPoints, evaluateBadges } from '../services/gamificationService.js';
import { toCategory } from '../utils/serialize.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { WasteCategory } from '@prisma/client';

const CATEGORY_MAP: Record<string, WasteCategory> = {
  plastic: 'PLASTIC',
  paper: 'PAPER',
  glass: 'GLASS',
  metal: 'METAL',
  organic: 'ORGANIC',
  'e-waste': 'E_WASTE',
  ewaste: 'E_WASTE',
  mixed: 'MIXED',
  other: 'OTHER',
};

const POINTS: Record<WasteCategory, number> = {
  PLASTIC: 25,
  PAPER: 25,
  GLASS: 25,
  METAL: 25,
  ORGANIC: 20,
  E_WASTE: 40,
  MIXED: 10,
  OTHER: 10,
};

function toPrismaCategory(raw: string): WasteCategory {
  const key = raw.toLowerCase().replace(/[\s_]+/g, '');
  return CATEGORY_MAP[key] ?? CATEGORY_MAP[raw.toLowerCase()] ?? 'OTHER';
}

/**
 * POST /api/classifications
 *
 * Accepts a multipart image, forwards it to the AI service, persists the
 * result and awards eco points. Returns 503 when AI_SERVICE_URL is unset so
 * the client can fall back to its labelled demo inference instead of storing
 * a fabricated prediction.
 */
export const classify = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  if (!file) throw badRequest('Attach an image in the "image" field.');

  const started = Date.now();
  let result;
  try {
    // Multer is configured with disk storage, so the bytes live at file.path.
    const buffer = await readFile(file.path);
    result = await aiClient.classify(buffer, file.originalname, file.mimetype);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw serviceUnavailable(err instanceof Error ? err.message : 'AI inference failed.');
  }

  const category = toPrismaCategory(result.category);
  const actor = req.user!;
  const points = POINTS[category];
  const categoryDef = await prisma.wasteCategoryDef.findUnique({ where: { category } });

  const classification = await prisma.wasteClassification.create({
    data: {
      userId: actor.id,
      categoryDefId: categoryDef?.id ?? null,
      category,
      itemName: result.itemName,
      confidence: result.confidence,
      recommendedBin: result.recommendedBin || categoryDef?.recommendedBin || 'General waste',
      binColor: result.binColor || categoryDef?.binColor || '#64748b',
      environmentalTip: result.environmentalTip || categoryDef?.environmentalTip || '',
      weightKg: result.weightKg ?? 0,
      co2SavedKg: result.co2SavedKg ?? 0,
      pointsEarned: points,
      imageUrl: `/uploads/${file.filename}`,
      source: 'api',
      modelId: result.modelId ?? null,
      latencyMs: result.latencyMs ?? Date.now() - started,
      alternatives: {
        create: (result.alternatives ?? []).map((a) => ({
          category: toPrismaCategory(a.category),
          confidence: a.confidence,
        })),
      },
    },
    include: { alternatives: true },
  });

  const user = await awardPoints(actor.id, points, `Classified ${result.itemName}`);
  const newBadges = await evaluateBadges(actor.id);

  return res
    .status(201)
    .json({ classification: serializeClassification(classification), pointsEarned: points, level: user.level, newBadges });
});

type ClassificationRow = {
  id: string;
  itemName: string;
  category: WasteCategory;
  confidence: number;
  recommendedBin: string;
  binColor: string;
  environmentalTip: string;
  weightKg: number;
  co2SavedKg: number;
  pointsEarned: number;
  imageUrl: string | null;
  source: string;
  modelId: string | null;
  latencyMs: number | null;
  createdAt: Date;
  alternatives?: { category: WasteCategory; confidence: number }[];
  user?: { id: string; name: string } | null;
};

function serializeClassification(c: ClassificationRow) {
  return {
    id: c.id,
    itemName: c.itemName,
    category: toCategory(c.category),
    confidence: c.confidence,
    recommendedBin: c.recommendedBin,
    binColor: c.binColor,
    environmentalTip: c.environmentalTip,
    weightKg: c.weightKg,
    co2SavedKg: c.co2SavedKg,
    pointsEarned: c.pointsEarned,
    imageUrl: c.imageUrl ?? undefined,
    source: c.source === 'api' ? 'api' : 'demo',
    modelId: c.modelId,
    latencyMs: c.latencyMs,
    createdAt: c.createdAt.toISOString(),
    userName: c.user?.name,
    alternatives: (c.alternatives ?? []).map((a) => ({
      category: toCategory(a.category),
      confidence: a.confidence,
    })),
  };
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
});

export const listClassifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = req.query as unknown as z.infer<typeof listQuerySchema>;
  const actor = req.user!;
  const isStaff = actor.role === 'MUNICIPALITY_ADMIN' || actor.role === 'SYSTEM_ADMIN';

  const where = {
    ...(isStaff ? {} : { userId: actor.id }),
    ...(q.category ? { category: toPrismaCategory(q.category) } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.wasteClassification.count({ where }),
    prisma.wasteClassification.findMany({
      where,
      include: { alternatives: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return res.json({ items: items.map(serializeClassification), total, page: q.page, pageSize: q.pageSize });
});

export const myTotals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const agg = await prisma.wasteClassification.aggregate({
    where: { userId: actor.id },
    _count: { _all: true },
    _sum: { weightKg: true, co2SavedKg: true },
  });

  const diverted = await prisma.wasteClassification.aggregate({
    where: { userId: actor.id, category: { notIn: ['MIXED', 'OTHER'] } },
    _sum: { weightKg: true },
  });

  return res.json({
    count: agg._count._all,
    weightKg: Number((agg._sum.weightKg ?? 0).toFixed(1)),
    co2SavedKg: Number((agg._sum.co2SavedKg ?? 0).toFixed(1)),
    divertedKg: Number((diverted._sum.weightKg ?? 0).toFixed(1)),
  });
});
