import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';
import { awardPoints, evaluateBadges } from '../services/gamificationService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Prisma, Priority, ReportStatus, ReportType } from '@prisma/client';
import { kebab, serializeReport, toPrismaEnum } from '../utils/serialize.js';

/** Eco points granted for filing a verified waste report. */
const REPORT_POINTS = 30;

const reportTypes = [
  'overflowing-bin',
  'illegal-dumping',
  'uncollected-waste',
  'roadside-waste',
  'mixed-waste',
  'hazardous-waste',
  'other',
] as const;

const statuses = ['submitted', 'assigned', 'in-progress', 'resolved', 'rejected'] as const;
const priorities = ['low', 'medium', 'high', 'critical'] as const;

export const createReportSchema = z.object({
  type: z.enum(reportTypes),
  description: z.string().trim().min(10, 'Describe the issue in at least 10 characters.').max(2000),
  notes: z.string().trim().max(1000).optional(),
  priority: z.enum(priorities).default('medium'),
  location: z.object({
    name: z.string().trim().min(2).max(160),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    zone: z.string().trim().max(120).optional(),
  }),
  imageUrl: z.string().trim().max(500).optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  type: z.enum(reportTypes).optional(),
  priority: z.enum(priorities).optional(),
  zone: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.wasteReport.count();
  return `BA-${year}-${String(count + 129).padStart(5, '0')}`;
}

const includeDetail = {
  user: { select: { id: true, name: true, email: true } },
  assignedWorker: { select: { id: true, name: true } },
  zone: { select: { id: true, name: true } },
  timeline: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.WasteReportInclude;

export const listReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const q = req.query as unknown as z.infer<typeof listQuerySchema>;
  const actor = req.user!;

  const where: Prisma.WasteReportWhereInput = {
    ...(q.status ? { status: toPrismaEnum<ReportStatus>(q.status) } : {}),
    ...(q.type ? { type: toPrismaEnum<ReportType>(q.type) } : {}),
    ...(q.priority ? { priority: toPrismaEnum<Priority>(q.priority) } : {}),
    ...(q.zone ? { zone: { name: { contains: q.zone, mode: 'insensitive' } } } : {}),
    ...(q.q
      ? {
          OR: [
            { reference: { contains: q.q, mode: 'insensitive' } },
            { landmark: { contains: q.q, mode: 'insensitive' } },
            { description: { contains: q.q, mode: 'insensitive' } },
            { user: { name: { contains: q.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  // Citizens and workers only ever see their own reports; keyword search stays
  // scoped to that single user rather than widening to the whole city.
  if (actor.role === 'CITIZEN' || actor.role === 'WORKER') {
    where.userId = actor.id;
  }

  const [total, items] = await prisma.$transaction([
    prisma.wasteReport.count({ where }),
    prisma.wasteReport.findMany({
      where,
      include: includeDetail,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return res.json({ items: items.map(serializeReport), total, page: q.page, pageSize: q.pageSize });
});

export const getReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await prisma.wasteReport.findUnique({
    where: { reference: req.params.reference },
    include: includeDetail,
  });
  if (!report) throw notFound('That report does not exist.');

  const actor = req.user!;
  const isStaff = actor.role === 'MUNICIPALITY_ADMIN' || actor.role === 'SYSTEM_ADMIN';
  if (!isStaff && report.userId !== actor.id && report.assignedWorkerId !== actor.id) {
    throw forbidden('You do not have access to this report.');
  }
  return res.json({ report: serializeReport(report) });
});

export const createReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof createReportSchema>;
  const actor = req.user!;

  const zone = input.location.zone
    ? await prisma.zone.findFirst({ where: { name: { contains: input.location.zone, mode: 'insensitive' } } })
    : null;

  const report = await prisma.wasteReport.create({
    data: {
      reference: await nextReference(),
      type: toPrismaEnum<ReportType>(input.type),
      description: input.description,
      notes: input.notes ?? null,
      priority: toPrismaEnum<Priority>(input.priority),
      latitude: input.location.lat,
      longitude: input.location.lng,
      landmark: input.location.name,
      imageUrl: input.imageUrl ?? null,
      zoneId: zone?.id ?? null,
      userId: actor.id,
      timeline: {
        create: [
          { status: 'CREATED', actor: actor.name },
          { status: 'SUBMITTED', actor: 'System' },
        ],
      },
    },
    include: includeDetail,
  });

  await prisma.notification.create({
    data: {
      userId: actor.id,
      type: 'REPORT_SUBMITTED',
      title: `Report ${report.reference} submitted`,
      body: 'Thanks for keeping your community clean. Track progress any time.',
      link: `/reports`,
    },
  });

  const pointsEarned = REPORT_POINTS;
  await awardPoints(actor.id, pointsEarned, `Reported ${kebab(report.type)}`);
  const newBadges = await evaluateBadges(actor.id);

  return res.status(201).json({ report: serializeReport(report), pointsEarned, newBadges });
});

export const assignReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ workerId: z.string().min(1) });
  const { workerId } = schema.parse(req.body);
  const actor = req.user!;

  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker || worker.role !== 'WORKER') throw badRequest('Assignee must be an active collection worker.');

  const report = await prisma.wasteReport.update({
    where: { reference: req.params.reference },
    data: {
      assignedWorkerId: worker.id,
      status: 'ASSIGNED',
      timeline: { create: { status: 'ASSIGNED', actor: actor.email, note: `Assigned to ${worker.name}` } },
    },
    include: includeDetail,
  });

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: report.userId,
        type: 'REPORT_ASSIGNED',
        title: `Report ${report.reference} assigned`,
        body: `${worker.name} is now handling your report.`,
        link: `/reports`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: worker.id,
        type: 'REPORT_ASSIGNED',
        title: `New assignment ${report.reference}`,
        body: `${report.landmark} — ${report.priority.toLowerCase()} priority.`,
        link: `/reports`,
      },
    }),
  ]);

  await writeAudit({ actor, action: 'report.assigned', target: `${report.reference} → ${worker.name}`, ipAddress: req.ip });
  return res.json({ report: serializeReport(report) });
});

export const updateReportStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    status: z.enum(statuses),
    note: z.string().trim().max(1000).optional(),
    resolutionImageUrl: z.string().trim().max(500).optional(),
  });
  const input = schema.parse(req.body);
  const actor = req.user!;
  const status = toPrismaEnum<ReportStatus>(input.status);

  const existing = await prisma.wasteReport.findUnique({ where: { reference: req.params.reference } });
  if (!existing) throw notFound('That report does not exist.');

  const canManage =
    actor.role === 'MUNICIPALITY_ADMIN' || actor.role === 'SYSTEM_ADMIN' || existing.assignedWorkerId === actor.id;
  if (!canManage) throw forbidden('Only the assigned worker or municipal staff can change a report status.');

  if (status === 'RESOLVED' && !input.note?.trim()) {
    throw badRequest('Resolution notes are required before closing a report.');
  }

  const report = await prisma.wasteReport.update({
    where: { reference: req.params.reference },
    data: {
      status,
      resolutionNotes: status === 'RESOLVED' ? input.note ?? existing.resolutionNotes : existing.resolutionNotes,
      resolutionImageUrl: input.resolutionImageUrl ?? existing.resolutionImageUrl,
      resolvedAt: status === 'RESOLVED' ? new Date() : existing.resolvedAt,
      timeline: { create: { status, actor: actor.email, note: input.note } },
    },
    include: includeDetail,
  });

  await prisma.notification.create({
    data: {
      userId: report.userId,
      type: status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
      title: `Report ${report.reference} is ${kebab(status)}`,
      body: input.note ?? `Updated by ${actor.name}.`,
      link: `/reports`,
    },
  });

  await writeAudit({ actor, action: 'report.status_changed', target: `${report.reference} → ${status}`, ipAddress: req.ip });

  if (status === 'RESOLVED') await evaluateBadges(report.userId);
  return res.json({ report: serializeReport(report) });
});

export const setReportPriority = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ priority: z.enum(priorities) });
  const { priority } = schema.parse(req.body);
  const actor = req.user!;

  const report = await prisma.wasteReport.update({
    where: { reference: req.params.reference },
    data: { priority: toPrismaEnum<Priority>(priority) },
    include: includeDetail,
  });

  await writeAudit({ actor, action: 'report.priority_changed', target: `${report.reference} → ${priority}`, ipAddress: req.ip });
  return res.json({ report: serializeReport(report) });
});

export const addReportNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ note: z.string().trim().min(2).max(1000) });
  const { note } = schema.parse(req.body);
  const actor = req.user!;

  const report = await prisma.wasteReport.update({
    where: { reference: req.params.reference },
    data: { timeline: { create: { status: 'NOTE', actor: actor.email, note } } },
    include: includeDetail,
  });

  return res.json({ report: serializeReport(report) });
});

export const deleteReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const report = await prisma.wasteReport.findUnique({ where: { reference: req.params.reference } });
  if (!report) throw notFound('That report does not exist.');
  if (actor.role !== 'SYSTEM_ADMIN' && report.userId !== actor.id) throw forbidden();

  await prisma.wasteReport.delete({ where: { id: report.id } });
  await writeAudit({ actor, action: 'report.deleted', target: report.reference, ipAddress: req.ip });
  return res.json({ ok: true });
});
