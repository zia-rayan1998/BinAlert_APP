import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  AUTH_COOKIE: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() === 'true'),
  COOKIE_NAME: z.string().default('binalert_token'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  ALLOWED_MIME_TYPES: z.string().default('image/png,image/jpeg,image/webp'),

  AI_SERVICE_URL: z.string().default(''),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(20000),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(10),

  SEED_PASSWORD: z.string().default('demo1234'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`\n[env] Invalid or missing environment variables:\n${issues}\n`);
  console.error('Copy server/.env.example to server/.env and fill in the values, then restart.\n');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  allowedMimeTypes: parsed.data.ALLOWED_MIME_TYPES.split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  maxUploadBytes: parsed.data.MAX_UPLOAD_MB * 1024 * 1024,
};

export type Env = typeof env;
