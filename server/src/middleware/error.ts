import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'not-found', message: `No route matches ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'internal-error';
  let message = 'Something went wrong on our side. Please try again.';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'validation';
    message = 'One or more fields are invalid.';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'duplicate';
      message = 'That record already exists.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'not-found';
      message = 'The requested record no longer exists.';
    } else {
      statusCode = 400;
      code = 'database';
      message = 'The database rejected this request.';
    }
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'file-too-large' : 'upload-error';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${env.MAX_UPLOAD_MB} MB upload limit.`
        : 'The upload could not be processed.';
  } else if (err instanceof Error) {
    message = env.isProduction ? message : err.message;
  }

  if (!env.isProduction && statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    error: { code, message, ...(details ? { details } : {}) },
  });
}
