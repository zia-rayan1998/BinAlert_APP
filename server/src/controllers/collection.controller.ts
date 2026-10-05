import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { kebab, toPrismaEnum } from '../utils/serialize.js';
import type { CollectionRoute, CollectionRun, CollectionRunStatus, CollectionVehicle, Prisma } from '@prisma/client';

type VehicleRow = CollectionVehicle & { route?: { id: string; name: string } | null };
type RunRow = CollectionRun & {
  route?: { id: string; name: string; zone?: { name: string } | null } | null;
  vehicle?: { id: string; name: string; plate: string } | null;
};

const serializeVehicle = (v: VehicleRow) => ({
  id: v.id,
  name: v.name,
  plate: v.plate,
  status: v.status,
  driver: v.driver ?? 'Unassigned',
  lat: v.latitude ?? 0,
  lng: v.longitude ?? 0,
  routeId: v.routeId ?? '',
  routeName: v.route?.name ?? '',
});

const serializeRun = (r: RunRow) => ({
  id: r.id,
  reference: r.reference,
  routeId: r.routeId,
  routeName: r.route?.name ?? 'Unassigned',
  zone: r.route?.zone?.name ?? 'Unassigned',
  vehicle: r.vehicle?.name ?? 'Unassigned',
  worker: r.worker,
  date: r.date.toISOString(),
  window: r.window,
  stops: r.stops,
  status: kebab(r.status),
});

const runStatuses = ['scheduled', 'in-progress', 'completed', 'missed'] as const;
const vehicleStatuses = ['active', 'idle', 'maintenance'] as const;

export const listRunsQuery = z.object({
  status: z.enum(runStatuses).optional(),
  routeId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Shapes a route row into the `{ ...route, optimized }` form the UI expects. */
export function toRoute(route: CollectionRoute & { zone?: { id: string; name: string } | null }) {
  return {
    id: route.id,
    name: route.name,
    zone: route.zone?.name ?? 'Unassigned',
    path: (route.path as [number, number][]) ?? [],
    stops: route.stops,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    optimized: {
      distanceKm: route.optimizedDistanceKm ?? route.distanceKm,
      durationMin: route.optimizedDurationMin ?? route.durationMin,
      fuelSavedL: route.fuelSavedL ?? 0,
      improvementPct: route.improvementPct ?? 0,
    },
  };
}

export const listVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const status = z.enum(vehicleStatuses).optional().parse(req.query.status);
  const vehicles = await prisma.collectionVehicle.findMany({
    where: status ? { status } : undefined,
    include: { route: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ vehicles: vehicles.map(serializeVehicle) });
});

export const getVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const vehicle = await prisma.collectionVehicle.findUnique({
    where: { plate: req.params.plate },
    include: { route: true, runs: { orderBy: { date: 'desc' }, take: 10 } },
  });
  if (!vehicle) throw notFound('That vehicle does not exist.');
  return res.json({ vehicle: serializeVehicle(vehicle), runs: vehicle.runs.map(serializeRun) });
});

export const updateVehiclePosition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    status: z.enum(vehicleStatuses).optional(),
  });
  const input = schema.parse(req.body);

  const vehicle = await prisma.collectionVehicle.update({
    where: { plate: req.params.plate },
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.status ? { status: input.status } : {}),
    },
    include: { route: { select: { id: true, name: true } } },
  });
  return res.json({ vehicle: serializeVehicle(vehicle) });
});

export const listRoutes = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const routes = await prisma.collectionRoute.findMany({
    include: { zone: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ routes: routes.map(toRoute) });
});

export const getRoute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const route = await prisma.collectionRoute.findFirst({
    where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
    include: { zone: { select: { id: true, name: true } }, vehicles: { include: { route: { select: { id: true, name: true } } } } },
  });
  if (!route) throw notFound('That route does not exist.');

  const bins = await prisma.bin.findMany({
    where: { zoneId: route.zoneId ?? undefined },
    select: { id: true, code: true, label: true, latitude: true, longitude: true, status: true, fillLevel: true },
    orderBy: { fillLevel: 'desc' },
  });

  return res.json({ route: toRoute(route), vehicles: route.vehicles.map(serializeVehicle), bins });
});

export const optimizeRouteSchema = z.object({
  // Fuel burn used to translate saved kilometres into litres; overridable so
  // municipalities can model their own fleet.
  fuelPerKm: z.coerce.number().positive().max(5).default(0.32),
});

/**
 * Re-sequences the route's stored path with a nearest-neighbour pass and
 * records the resulting distance/time/fuel figures. This is a deterministic
 * heuristic, not a model — it never claims to be an AI prediction.
 */
export const optimizeRoute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fuelPerKm } = optimizeRouteSchema.parse(req.body ?? {});
  const actor = req.user!;

  const route = await prisma.collectionRoute.findFirst({
    where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
  });
  if (!route) throw notFound('That route does not exist.');

  const stops = (route.path as [number, number][]) ?? [];
  if (!Array.isArray(stops) || stops.length < 3) {
    throw badRequest('This route has too few stops to optimise.');
  }

  const ordered = nearestNeighbour(stops);
  const distanceKm = Number(pathLengthKm(ordered).toFixed(1));
  const baselineKm = Number(pathLengthKm(stops).toFixed(1));
  const durationMin = Math.max(10, Math.round(distanceKm * 3.2 + ordered.length * 1.6));
  const baselineMin = route.durationMin || Math.max(10, Math.round(baselineKm * 3.2 + stops.length * 1.6));

  const updated = await prisma.collectionRoute.update({
    where: { id: route.id },
    data: {
      path: ordered,
      distanceKm: baselineKm,
      durationMin: baselineMin,
      optimizedDistanceKm: distanceKm,
      optimizedDurationMin: durationMin,
      fuelSavedL: Number(Math.max(0, (baselineKm - distanceKm) * fuelPerKm).toFixed(1)),
      improvementPct: baselineKm > 0 ? Number((((baselineKm - distanceKm) / baselineKm) * 100).toFixed(1)) : 0,
    },
  });

  await writeAudit({
    actor,
    action: 'route.optimized',
    target: `${updated.name} — ${baselineKm} km → ${distanceKm} km`,
    metadata: { stops: ordered.length, fuelPerKm },
    ipAddress: req.ip,
  });

  return res.json({ route: toRoute(updated) });
});

export const listRuns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = listRunsQuery.parse(req.query);
  const where: Prisma.CollectionRunWhereInput = {
    ...(q.status ? { status: toPrismaEnum<CollectionRunStatus>(q.status) } : {}),
    ...(q.routeId ? { routeId: q.routeId } : {}),
    ...(q.from || q.to ? { date: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
  };

  const runs = await prisma.collectionRun.findMany({
    where,
    include: {
      route: { select: { id: true, name: true, zone: { select: { name: true } } } },
      vehicle: { select: { id: true, name: true, plate: true } },
    },
    orderBy: { date: 'asc' },
  });

  const counts = await prisma.collectionRun.groupBy({ by: ['status'], _count: { _all: true } });
  const summary = Object.fromEntries(counts.map((c) => [kebab(c.status), c._count._all]));

  return res.json({ runs: runs.map(serializeRun), summary });
});

export const updateRunStatusSchema = z.object({
  status: z.enum(['scheduled', 'in-progress', 'completed', 'missed']),
});

export const updateRunStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = updateRunStatusSchema.parse(req.body);
  const actor = req.user!;

  const run = await prisma.collectionRun.update({
    where: { reference: req.params.reference },
    data: { status: toPrismaEnum<CollectionRunStatus>(status) },
    include: {
      route: { select: { id: true, name: true, zone: { select: { name: true } } } },
      vehicle: { select: { id: true, name: true, plate: true } },
    },
  });

  await writeAudit({ actor, action: 'run.status_changed', target: `${run.reference} → ${status}`, ipAddress: req.ip });
  return res.json({ run: serializeRun(run) });
});

/** Greedy nearest-neighbour ordering starting from the first stored stop. */
function nearestNeighbour(points: [number, number][]): [number, number][] {
  const remaining = points.slice(1);
  const ordered: [number, number][] = [points[0]!];
  let current = points[0]!;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]!);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    current = remaining.splice(bestIndex, 1)[0]!;
    ordered.push(current);
  }
  return ordered;
}

function pathLengthKm(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1]!, points[i]!);
  return total;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
