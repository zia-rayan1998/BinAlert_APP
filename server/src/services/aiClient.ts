import { env } from '../config/env.js';
import { serviceUnavailable } from '../utils/errors.js';

/**
 * Thin client for the Python FastAPI inference service.
 *
 * The Node API never runs a model itself — it proxies to `AI_SERVICE_URL`.
 * When that variable is empty the endpoints return 503 so the frontend can
 * fall back to its clearly-labelled demo inference instead of silently
 * fabricating predictions.
 */

function baseUrl(): string {
  if (!env.AI_SERVICE_URL) {
    throw serviceUnavailable(
      'The AI inference service is not configured. Set AI_SERVICE_URL in server/.env, or leave VITE_AI_API_URL empty in the frontend to use demo mode.',
    );
  }
  return env.AI_SERVICE_URL.replace(/\/$/, '');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw serviceUnavailable(`AI service responded ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw serviceUnavailable(`AI service timed out after ${env.AI_REQUEST_TIMEOUT_MS} ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface ClassificationResponse {
  itemName: string;
  category: string;
  confidence: number;
  alternatives: { category: string; confidence: number }[];
  recommendedBin: string;
  binColor: string;
  environmentalTip: string;
  weightKg: number;
  co2SavedKg: number;
  pointsEarned: number;
  modelId?: string;
  latencyMs?: number;
  mode?: 'heuristic' | 'model';
  disclaimer?: string;
}

export interface ForecastResponse {
  horizonDays: number;
  model: string;
  mode?: string;
  confidence: number;
  series: { label: string; predicted: number; bandLow: number; bandHigh: number }[];
  summary: Record<string, unknown>;
  disclaimer?: string;
}

export const aiClient = {
  classify(image: Buffer, filename: string, contentType: string): Promise<ClassificationResponse> {
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(image)], { type: contentType }), filename);
    return request<ClassificationResponse>('/api/ai/classify', { method: 'POST', body: form });
  },

  forecast(
    horizonDays: number,
    scope: string,
    history: { label: string; value: number }[],
  ): Promise<ForecastResponse> {
    return request<ForecastResponse>('/api/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horizon_days: horizonDays, scope, history }),
    });
  },

  modelInfo(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/ai/model-info');
  },

  health(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/health');
  },
};
