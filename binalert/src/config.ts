/**
 * Runtime configuration.
 *
 * Every upstream URL is read from Vite environment variables — nothing is
 * hard-coded to a production host. When `VITE_AI_API_URL` is empty the app
 * runs in demo mode against the local mock service layer.
 */

function read(key: string, fallback = ''): string {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/$/, '') : fallback;
}

export const API_URL = read('VITE_API_URL', '');
export const AI_API_URL = read('VITE_AI_API_URL', '');
export const APP_NAME = read('VITE_APP_NAME', 'BinAlert');
export const APP_VERSION = read('VITE_APP_VERSION', '1.0.0');

/** True when no application API is configured; services use the local demo layer. */
export const DEMO_MODE = API_URL === '';

/** True when no AI service is configured; classification uses on-device demo inference. */
export const AI_DEMO_MODE = AI_API_URL === '';

/** Request timeout for upstream calls, in milliseconds. */
export const REQUEST_TIMEOUT_MS = Number(read('VITE_REQUEST_TIMEOUT_MS', '15000')) || 15000;
