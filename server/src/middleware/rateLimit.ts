import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

/** General API limiter — applied to every /api route. */
export const apiLimiter = rateLimit({
  windowMs,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate-limited', message: 'Too many requests. Please slow down and try again shortly.' } },
});

/** Stricter limiter for credential endpoints to blunt brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'rate-limited', message: 'Too many authentication attempts. Try again in a few minutes.' } },
});
