import type { ForecastPoint } from '../types';
import { latency } from './storage';

/**
 * ForecastingService — demo generator producing a historical series plus a
 * 7/30-day prediction with confidence bands. Mirrors the response shape a
 * Prophet/LSTM backend would return from POST /api/ai/forecast.
 */

const HISTORY_BASE = 1180;

function buildSeries(days: number, horizon: number): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const today = new Date();
  for (let i = days; i > 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const seasonal = Math.sin((i / 30) * Math.PI * 2) * 60;
    const weekly = [8, -4, -6, 2, 10, 26, 18][d.getDay()];
    const noise = ((i * 7919) % 53) - 26;
    points.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: Math.round(HISTORY_BASE + seasonal + weekly + noise),
    });
  }
  const lastActual = points[points.length - 1].actual ?? HISTORY_BASE;
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const weekly = [8, -4, -6, 2, 10, 26, 18][d.getDay()];
    const trend = i * 2.4;
    const predicted = Math.round(lastActual + trend + weekly * 0.6);
    const spread = 40 + i * 4.5;
    points.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predicted,
      bandLow: Math.round(predicted - spread),
      bandHigh: Math.round(predicted + spread),
    });
  }
  return points;
}

export const forecastService = {
  async series(horizon: 7 | 30): Promise<ForecastPoint[]> {
    await latency(500, 900);
    return buildSeries(horizon === 7 ? 30 : 60, horizon);
  },

  async summary() {
    await latency(300, 600);
    return {
      currentAverageKgDay: 1240,
      predictedNextWeekKgDay: 1315,
      expectedIncreasePct: 6.0,
      confidence: 87,
      model: 'Prophet (seasonal + weekly regressors) — demo parameters',
      seasonalNote: 'Festival-week surge expected in Zone B; pre-position 2 extra compactor runs.',
      zonePredictions: [
        { zone: 'Zone A — Riverside', kgDay: 486, deltaPct: 4.2 },
        { zone: 'Zone B — Old Town', kgDay: 512, deltaPct: 9.1 },
        { zone: 'Zone C — Tech Park', kgDay: 317, deltaPct: 3.4 },
      ],
    };
  },
};
