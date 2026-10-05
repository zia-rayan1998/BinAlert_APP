/**
 * Single source of truth for the eco-points ladder. Mirrors the ladder the
 * citizen app renders so the API and UI never disagree about a level name.
 */
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
] as const;

export type LevelDef = (typeof LEVELS)[number];

export function levelFor(points: number): LevelDef {
  let current: LevelDef = LEVELS[0];
  for (const entry of LEVELS) {
    if (points >= entry.minPoints) current = entry;
  }
  return current;
}

export function levelProgress(points: number) {
  const current = levelFor(points);
  const next = LEVELS.find((l) => l.minPoints > points) ?? null;
  const span = next ? next.minPoints - current.minPoints : 1;
  const progress = next ? ((points - current.minPoints) / span) * 100 : 100;
  return { current, next, progress: Math.min(100, Math.max(0, Number(progress.toFixed(1)))) };
}
