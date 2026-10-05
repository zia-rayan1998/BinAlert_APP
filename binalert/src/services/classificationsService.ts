import type { ClassificationResult } from '../types';
import { CITIZEN_CLASSIFICATIONS } from './demoData';
import { latency, readLS, writeLS } from './storage';

interface StoredClassification extends ClassificationResult {
  userId: string;
}

function seed(userId: string): StoredClassification[] {
  const existing = readLS<StoredClassification[] | null>('classifications', null);
  if (existing) return existing;
  const seeded = CITIZEN_CLASSIFICATIONS.map((c) => ({ ...c, userId: 'u-citizen' }));
  writeLS('classifications', seeded);
  void userId;
  return seeded;
}

export const classificationsService = {
  async list(userId: string): Promise<ClassificationResult[]> {
    await latency();
    return seed(userId)
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async save(userId: string, result: ClassificationResult): Promise<ClassificationResult> {
    await latency(200, 400);
    const all = seed(userId);
    const stored: StoredClassification = { ...result, userId };
    writeLS('classifications', [stored, ...all]);
    return result;
  },

  async totals(userId: string) {
    await latency(150, 300);
    const mine = seed(userId).filter((c) => c.userId === userId);
    return {
      count: mine.length,
      weightKg: +mine.reduce((s, c) => s + c.weightKg, 0).toFixed(1),
      co2SavedKg: +mine.reduce((s, c) => s + c.co2SavedKg, 0).toFixed(1),
      divertedKg: +mine.filter((c) => c.category !== 'mixed' && c.category !== 'other').reduce((s, c) => s + c.weightKg, 0).toFixed(1),
    };
  },
};
