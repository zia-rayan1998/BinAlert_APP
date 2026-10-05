import { prisma } from '../lib/prisma.js';
import type { User } from '@prisma/client';

export interface AuditInput {
  actor?: Pick<User, 'id' | 'email'> | null;
  action: string;
  target: string;
  metadata?: unknown;
  ipAddress?: string;
}

/** Append-only record of privileged actions. Failures never break a request. */
export async function writeAudit({ actor, action, target, metadata, ipAddress }: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? 'system',
        action,
        target,
        metadata: metadata === undefined ? undefined : (metadata as object),
        ipAddress,
      },
    });
  } catch (err) {
    console.error('[audit] failed to persist entry', err);
  }
}
