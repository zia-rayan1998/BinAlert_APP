import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sessionCookieOptions, signSession } from '../services/tokenService.js';
import { writeAudit } from '../services/auditService.js';
import { serializeUser } from '../utils/serialize.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Role, User } from '@prisma/client';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  // Self-service signup can never create a system administrator.
  role: z.enum(['citizen', 'worker', 'municipality']).default('citizen'),
  location: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required.'),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  location: z.string().trim().max(120).optional(),
});

const SIGNUP_ROLE: Record<string, Role> = {
  citizen: 'CITIZEN',
  worker: 'WORKER',
  municipality: 'MUNICIPALITY_ADMIN',
};

function roleForSignup(role: string): Role {
  return SIGNUP_ROLE[role] ?? 'CITIZEN';
}

function deliverSession(res: Response, user: User) {
  const token = signSession({ sub: user.id, role: user.role });
  if (env.AUTH_COOKIE) {
    res.cookie(env.COOKIE_NAME, token, sessionCookieOptions());
  }
  return res.status(200).json({ token: env.AUTH_COOKIE ? undefined : token, user: serializeUser(user) });
}

export const signup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof signupSchema>;
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists.');

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
      role: roleForSignup(input.role),
      location: input.location ?? null,
      avatarHue: crypto.randomInt(0, 360),
    },
  });

  await writeAudit({ actor: user, action: 'auth.signup', target: user.email, ipAddress: req.ip });
  return deliverSession(res.status(201), user);
});

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for unknown email and wrong password — no account enumeration.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password.');
  }
  if (!user.isActive) throw unauthorized('This account has been suspended.');

  await writeAudit({ actor: user, action: 'auth.login', target: user.email, ipAddress: req.ip });
  return deliverSession(res, user);
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { badges: { include: { badge: true } } },
  });
  if (!user) throw notFound('Account no longer exists.');
  return res.json({ user: serializeUser(user) });
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.clearCookie(env.COOKIE_NAME, { path: '/' });
  if (req.user) await writeAudit({ actor: req.user, action: 'auth.logout', target: req.user.email, ipAddress: req.ip });
  return res.json({ ok: true });
});

export const forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof forgotSchema>;
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always return the same message so the endpoint cannot enumerate accounts.
  const message = 'If an account exists for this email, a reset link has been sent.';
  if (!user) return res.json({ message });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000),
    },
  });

  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
  if (env.isDevelopment) {
    // No mail transport in local development — surface the link in the console.
    console.log(`\n[auth] Password reset for ${user.email}:\n       ${resetUrl}\n`);
  }
  return res.json({ message, ...(env.isDevelopment ? { devResetUrl: resetUrl } : {}) });
});

export const resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof resetSchema>;
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired.');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS) },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  return res.json({ message: 'Password updated. Sign in with your new password.' });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof updateProfileSchema>;
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: input });
  return res.json({ user: serializeUser(user) });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });
  const input = schema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw unauthorized('Your current password is incorrect.');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS) },
  });
  await writeAudit({ actor: user, action: 'auth.password_changed', target: user.email, ipAddress: req.ip });
  return res.json({ ok: true });
});
