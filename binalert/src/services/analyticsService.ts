import type { ClassificationResult } from '../types';
import { MONTHLY_SERIES, WEEKLY_ACTIVITY, ZONE_COMPARISON } from './demoData';
import { latency, readLS } from './storage';

export const analyticsService = {
  async monthlySeries() {
    await latency();
    return MONTHLY_SERIES.map((m) => ({ ...m }));
  },

  async zoneComparison() {
    await latency();
    return ZONE_COMPARISON.map((z) => ({ ...z }));
  },

  async weeklyActivity() {
    await latency(150, 350);
    return WEEKLY_ACTIVITY.map((w) => ({ ...w }));
  },

  async categoryDistribution(userId?: string) {
    await latency(150, 350);
    if (userId) {
      const classifications = readLS<ClassificationResult[]>('classifications', []);
      const mine = classifications.filter((c) => (c as ClassificationResult & { userId?: string }).userId === userId);
      const counts = new Map<string, number>();
      mine.forEach((c) => counts.set(c.category, (counts.get(c.category) ?? 0) + 1));
      if (counts.size === 0) return [];
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      return [...counts.entries()].map(([category, value]) => ({
        category,
        value,
        pct: Math.round((value / total) * 100),
      }));
    }
    return [
      { category: 'plastic', value: 970, pct: 34 },
      { category: 'organic', value: 822, pct: 29 },
      { category: 'paper', value: 590, pct: 21 },
      { category: 'glass', value: 272, pct: 9 },
      { category: 'metal', value: 186, pct: 6 },
      { category: 'e-waste', value: 95, pct: 3 },
    ];
  },

  async reportsByDay() {
    await latency(150, 350);
    return [
      { day: 'Mon', reports: 6 },
      { day: 'Tue', reports: 4 },
      { day: 'Wed', reports: 9 },
      { day: 'Thu', reports: 7 },
      { day: 'Fri', reports: 11 },
      { day: 'Sat', reports: 13 },
      { day: 'Sun', reports: 5 },
    ];
  },

  async collectionEfficiency() {
    await latency(150, 350);
    return [
      { month: 'May', efficiency: 84 },
      { month: 'Jun', efficiency: 86 },
      { month: 'Jul', efficiency: 85 },
      { month: 'Aug', efficiency: 89 },
      { month: 'Sep', efficiency: 91 },
      { month: 'Oct', efficiency: 91.4 },
    ];
  },
};
