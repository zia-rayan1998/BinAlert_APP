import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

export interface SessionClaims {
  sub: string;
  role: Role;
}

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  } as const;
}
