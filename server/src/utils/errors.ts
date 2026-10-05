export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'error',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, 'bad-request', details);
export const unauthorized = (msg = 'Authentication required.') => new ApiError(401, msg, 'unauthorized');
export const forbidden = (msg = 'You do not have permission to perform this action.') => new ApiError(403, msg, 'forbidden');
export const notFound = (msg = 'Resource not found.') => new ApiError(404, msg, 'not-found');
export const conflict = (msg: string) => new ApiError(409, msg, 'conflict');
export const serviceUnavailable = (msg: string) => new ApiError(503, msg, 'service-unavailable');
