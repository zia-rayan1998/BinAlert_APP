import type {
  Bin,
  Notification,
  NotificationType,
  Priority,
  ReportStatus,
  ReportType,
  Role,
  TimelineEvent,
  WasteCategory,
  WasteReport,
} from '@prisma/client';

/**
 * Response serializers.
 *
 * The database stores SCREAMING_SNAKE enums; every client of this API consumes
 * kebab-case values (`in-progress`, `e-waste`, `municipality`). Mapping lives
 * here so controllers stay about persistence and the wire contract stays in one
 * place.
 */

type ReportWithRelations = WasteReport & {
  user?: { id: string; name: string; email: string } | null;
  assignedWorker?: { id: string; name: string } | null;
  zone?: { id: string; name: string } | null;
  timeline?: TimelineEvent[];
};

type BinWithZone = Bin & { zone?: { id: string; name: string } | null };

const ROLE_MAP: Record<Role, string> = {
  CITIZEN: 'citizen',
  WORKER: 'worker',
  MUNICIPALITY_ADMIN: 'municipality',
  SYSTEM_ADMIN: 'admin',
};

export const kebab = (value: string): string => value.toLowerCase().replace(/_/g, '-');

/**
 * Inverse of {@link kebab} for request bodies. Accepts either casing so a
 * client can send `in-progress` or `IN_PROGRESS` and both resolve.
 */
export const toPrismaEnum = <T extends string>(value: string): T =>
  value.trim().toUpperCase().replace(/-/g, '_') as T;

export const toRole = (role: Role): string => ROLE_MAP[role];

export const toCategory = (category: WasteCategory): string => kebab(category);

export const toReportType = (type: ReportType): string => kebab(type);

export const toReportStatus = (status: ReportStatus): string => kebab(status);

export const toPriority = (priority: Priority): string => kebab(priority);

/** Inverse of {@link toRole}; rejects unknown values rather than defaulting. */
export function toPrismaRole(role: string): Role {
  const match = (Object.keys(ROLE_MAP) as Role[]).find((k) => ROLE_MAP[k] === role || k === role);
  if (!match) throw new Error(`Unknown role "${role}"`);
  return match;
}

/** The subset of `User` every serializer needs — works with Prisma `select`s. */
type UserLike = {
  id: string;
  name: string;
  email: string;
  role: Role;
  location: string | null;
  avatarHue: number;
  isActive: boolean;
  ecoScore: number;
  points: number;
  level: number;
  municipalityId: string | null;
  createdAt: Date;
  badges?: { badge: { key: string } }[];
};

export function serializeUser(user: UserLike): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toRole(user.role),
    location: user.location ?? '',
    joinedAt: user.createdAt.toISOString(),
    ecoScore: user.ecoScore,
    points: user.points,
    level: user.level,
    avatarHue: user.avatarHue,
    isActive: user.isActive,
    municipalityId: user.municipalityId,
    badges: (user.badges ?? []).map((b) => b.badge.key),
  };
}

export function serializeReport(report: ReportWithRelations): Record<string, unknown> {
  return {
    id: report.id,
    reference: report.reference,
    userId: report.userId,
    userName: report.user?.name ?? 'Unknown',
    type: toReportType(report.type),
    description: report.description,
    notes: report.notes ?? '',
    priority: toPriority(report.priority),
    status: toReportStatus(report.status),
    imageUrl: report.imageUrl ?? undefined,
    location: {
      name: report.landmark,
      lat: report.latitude,
      lng: report.longitude,
      zone: report.zone?.name ?? 'Unassigned',
    },
    assignedWorker: report.assignedWorker?.name,
    resolutionNotes: report.resolutionNotes ?? undefined,
    resolutionImageUrl: report.resolutionImageUrl ?? undefined,
    resolvedAt: report.resolvedAt?.toISOString(),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    timeline: (report.timeline ?? []).map((t) => ({
      status: kebab(t.status),
      at: t.createdAt.toISOString(),
      by: t.actor,
      note: t.note ?? undefined,
    })),
  };
}

export function serializeBin(bin: BinWithZone): Record<string, unknown> {
  return {
    id: bin.id,
    code: bin.code,
    label: bin.label,
    zone: bin.zone?.name ?? 'Unassigned',
    lat: bin.latitude,
    lng: bin.longitude,
    status: kebab(bin.status),
    fillLevel: bin.fillLevel,
    accepted: bin.accepted.map(toCategory),
    lastCollectedAt: bin.lastCollectedAt?.toISOString() ?? '',
  };
}

const NOTIFICATION_TYPE_MAP: Record<NotificationType, string> = {
  REPORT_SUBMITTED: 'report-submitted',
  REPORT_ASSIGNED: 'report-assigned',
  STATUS_CHANGED: 'status-changed',
  RESOLVED: 'resolved',
  COLLECTION: 'collection',
  ACHIEVEMENT: 'achievement',
  POINTS: 'points',
};

export function serializeNotification(n: Notification): Record<string, unknown> {
  return {
    id: n.id,
    type: NOTIFICATION_TYPE_MAP[n.type],
    title: n.title,
    body: n.body,
    at: n.createdAt.toISOString(),
    read: n.read,
    link: n.link,
  };
}
