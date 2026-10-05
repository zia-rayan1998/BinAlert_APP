import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import type { Role, User } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

function extractToken(req: Request): string | null {
  if (env.AUTH_COOKIE) {
    const cookie = req.cookies?.[env.COOKIE_NAME];
    if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  }
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/** Populates `req.user` when a valid token is present; never rejects. */
export async function attachUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    }
  } catch {
    // Invalid or expired token — treat the request as anonymous.
  }
  next();
}

/** Rejects the request unless a valid, active session exists. */
export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) return next(unauthorized());
  next();
}

/** Rejects the request unless the caller holds one of the listed roles. */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Municipal staff may only touch resources inside their own municipality. */
export function requireSameMunicipality(municipalityIdOf: (req: AuthenticatedRequest) => string | null | undefined) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'SYSTEM_ADMIN') return next();
    const target = municipalityIdOf(req);
    if (target && req.user.municipalityId && target !== req.user.municipalityId) {
      return next(forbidden('That resource belongs to a different municipality.'));
    }
    next();
  };
}
