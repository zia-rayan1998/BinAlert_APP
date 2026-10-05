import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validates a request segment against a Zod schema and replaces it with the
 * parsed (and therefore typed + defaulted) value.
 */
export function validate<T extends ZodTypeAny>(schema: T, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 5 makes `query` read-only; assign defensively.
    try {
      (req as unknown as Record<string, unknown>)[source] = result.data;
    } catch {
      Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}
