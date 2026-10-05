import type { AppNotification } from '../types';
import { DEMO_NOTIFICATIONS } from './demoData';
import { latency, readLS, writeLS } from './storage';
import { uid } from '../utils/format';

function seed(): AppNotification[] {
  const existing = readLS<AppNotification[] | null>('notifications', null);
  if (existing) return existing;
  writeLS('notifications', DEMO_NOTIFICATIONS);
  return [...DEMO_NOTIFICATIONS];
}

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    await latency(150, 350);
    return [...seed()].sort((a, b) => b.at.localeCompare(a.at));
  },

  async markAllRead(): Promise<AppNotification[]> {
    await latency(150, 300);
    const all = seed().map((n) => ({ ...n, read: true }));
    writeLS('notifications', all);
    return all;
  },

  async markRead(id: string): Promise<void> {
    const all = seed().map((n) => (n.id === id ? { ...n, read: true } : n));
    writeLS('notifications', all);
  },

  push(input: Omit<AppNotification, 'id' | 'at' | 'read'>): AppNotification {
    const notification: AppNotification = { ...input, id: uid('nt'), at: new Date().toISOString(), read: false };
    writeLS('notifications', [notification, ...seed()]);
    return notification;
  },
};
