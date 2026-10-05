import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { aiClient } from '../services/aiClient.js';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

/** Below this many daily observations a fitted curve would be meaningless. */
const MIN_FORECAST_OBSERVATIONS = 7;

/**
 * The Node API never runs a model. These handlers proxy to the Python
 * inference service and report honestly when it is not reachable, so the
 * frontend can fall back to its clearly-labelled demo mode.
 */

export const health = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  if (!env.AI_SERVICE_URL) {
    return res.json({ status: 'unconfigured', configured: false, mode: 'demo', url: null });
  }

  const started = Date.now();
  try {
    const upstream = await aiClient.health();
    return res.json({
      status: 'up',
      configured: true,
      mode: 'live',
      url: env.AI_SERVICE_URL,
      latencyMs: Date.now() - started,
      upstream,
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unreachable',
      configured: true,
      mode: 'unavailable',
      url: env.AI_SERVICE_URL,
      error: err instanceof Error ? err.message : 'AI service unreachable.',
    });
  }
});

/**
 * Model metadata. Returns `{ configured: false }` instead of 503 because this
 * endpoint describes the system's state rather than producing a prediction.
 */
export const modelInfo = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  if (!env.AI_SERVICE_URL) {
    return res.json({ configured: false, mode: 'demo', model: null });
  }
  try {
    const info = await aiClient.modelInfo();
    return res.json({ configured: true, mode: 'live', ...info });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return res.status(503).json({
      configured: true,
      mode: 'unavailable',
      error: err instanceof Error ? err.message : 'AI service unreachable.',
    });
  }
});

export const forecastSchema = z.object({
  horizonDays: z.coerce.number().int().min(1).max(90).default(7),
  scope: z.string().trim().max(120).default('city'),
});

/**
 * Builds the observation window the forecaster needs: total classified weight
 * per day. Real records only — when there is not enough history the request
 * fails rather than returning an invented curve.
 */
async function buildHistory(days: number): Promise<{ label: string; value: number }[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);

  const rows = await prisma.wasteClassification.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, weightKg: true },
  });

  const buckets = new Map<string, number>();
  for (let i = days; i >= 1; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.weightKg);
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
}

/**
 * Proxies a demand forecast and caches the response in `forecast_results`.
 * Nothing is synthesised here — if the inference service is down, or there is
 * not enough history to fit, the request fails and the client shows its
 * labelled demo banner instead.
 */
export const forecast = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = forecastSchema.parse(req.body ?? {});

  const history = await buildHistory(input.horizonDays >= 30 ? 120 : 60);
  const observed = history.filter((h) => h.value > 0).length;
  if (observed < MIN_FORECAST_OBSERVATIONS) {
    throw badRequest(
      `Forecasting needs at least ${MIN_FORECAST_OBSERVATIONS} days of recorded waste data (found ${observed}). ` +
        'Keep the dashboard in demo mode until more classifications are stored.',
    );
  }

  const result = await aiClient.forecast(input.horizonDays, input.scope, history);

  const stored = await prisma.forecastResult.create({
    data: {
      scope: input.scope,
      horizonDays: input.horizonDays,
      model: result.model,
      confidence: result.confidence,
      series: result.series as object,
      summary: { ...result.summary, mode: result.mode ?? 'baseline', disclaimer: result.disclaimer ?? null } as object,
    },
  });

  return res.status(201).json({ forecast: stored, ...result });
});

export const forecastHistoryQuery = z.object({
  scope: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const forecastHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = forecastHistoryQuery.parse(req.query);
  const items = await prisma.forecastResult.findMany({
    where: q.scope ? { scope: q.scope } : undefined,
    orderBy: { createdAt: 'desc' },
    take: q.limit,
  });
  return res.json({ items });
});

export const statsQuery = z.object({ hours: z.coerce.number().int().positive().max(720).default(24) });

/**
 * Accuracy and latency statistics computed from stored classifications —
 * i.e. what the deployed model actually returned, not a hard-coded figure.
 */
export const stats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = statsQuery.parse(req.query);
  const since = new Date(Date.now() - q.hours * 3_600_000);

  const [recent, byCategory, latency] = await Promise.all([
    prisma.wasteClassification.count({ where: { createdAt: { gte: since } } }),
    prisma.wasteClassification.groupBy({
      by: ['category'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _avg: { confidence: true, latencyMs: true },
    }),
    prisma.wasteClassification.aggregate({
      where: { createdAt: { gte: since }, source: 'api' },
      _avg: { latencyMs: true, confidence: true },
    }),
  ]);

  const total = byCategory.reduce((acc, c) => acc + c._count._all, 0) || 1;
  return res.json({
    windowHours: q.hours,
    requests: recent,
    backend: env.AI_SERVICE_URL ? `ai-service (${env.AI_SERVICE_URL})` : 'demo-inference',
    averageConfidencePct: Number(((latency._avg.confidence ?? 0) * 100).toFixed(1)),
    averageLatencyMs: Math.round(latency._avg.latencyMs ?? 0),
    perCategory: byCategory.map((c) => ({
      category: c.category,
      samples: c._count._all,
      sharePct: Number(((c._count._all / total) * 100).toFixed(1)),
      // Mean confidence stands in for precision/recall: no labelled ground
      // truth exists in this deployment, so those metrics are reported as null
      // rather than guessed.
      precision: null as number | null,
      recall: null as number | null,
      meanConfidencePct: Number(((c._avg.confidence ?? 0) * 100).toFixed(1)),
      meanLatencyMs: Math.round(c._avg.latencyMs ?? 0),
    })),
  });
});
