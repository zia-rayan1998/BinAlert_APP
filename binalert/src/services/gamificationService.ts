import type { BadgeDef, LeaderboardEntry } from '../types';
import { BADGES, LEADERBOARD } from './demoData';
import { latency } from './storage';

export const LEVELS = [
  { level: 1, name: 'Contributor', minPoints: 0 },
  { level: 2, name: 'Sorter', minPoints: 400 },
  { level: 3, name: 'Recycler', minPoints: 800 },
  { level: 4, name: 'Green Advocate', minPoints: 1200 },
  { level: 5, name: 'Community Leader', minPoints: 1600 },
  { level: 6, name: 'Eco Champion', minPoints: 2000 },
  { level: 7, name: 'City Steward', minPoints: 2800 },
  { level: 8, name: 'Sustainability Expert', minPoints: 3600 },
  { level: 9, name: 'Zero-Waste Pioneer', minPoints: 4400 },
  { level: 10, name: 'BinAlert Legend', minPoints: 5600 },
];

export function levelInfo(points: number) {
  const current = [...LEVELS].reverse().find((l) => points >= l.minPoints) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.minPoints > points);
  const span = next ? next.minPoints - current.minPoints : 1;
  const progress = next ? ((points - current.minPoints) / span) * 100 : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)) };
}

export const gamificationService = {
  async badges(): Promise<BadgeDef[]> {
    await latency(150, 300);
    return [...BADGES];
  },

  async leaderboard(): Promise<LeaderboardEntry[]> {
    await latency();
    return [...LEADERBOARD];
  },
};
