import type { AuditLogEntry, Role, User, WasteCategory } from '../types';
import { AUDIT_LOGS, DEMO_USERS } from './demoData';
import { latency, readLS, writeLS } from './storage';
import { uid } from '../utils/format';
import { CATEGORY_META } from '../utils/labels';

interface StoredUser extends User {
  password: string;
}

function seedUsers(): StoredUser[] {
  const existing = readLS<StoredUser[] | null>('users', null);
  if (existing) return existing;
  writeLS('users', DEMO_USERS);
  return [...DEMO_USERS];
}

function publicUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

function seedAudit(): AuditLogEntry[] {
  const existing = readLS<AuditLogEntry[] | null>('audit', null);
  if (existing) return existing;
  writeLS('audit', AUDIT_LOGS);
  return [...AUDIT_LOGS];
}

export const adminService = {
  async users(): Promise<User[]> {
    await latency();
    return seedUsers().map(publicUser);
  },

  async setUserRole(id: string, role: Role, actor: string): Promise<User> {
    await latency(300, 600);
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === id);
    users[idx] = { ...users[idx], role };
    writeLS('users', users);
    adminService.logAudit(actor, 'user.role_updated', `${users[idx].email} → ${role}`);
    return publicUser(users[idx]);
  },

  async setUserStatus(id: string, active: boolean, actor: string): Promise<void> {
    await latency(250, 500);
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === id);
    adminService.logAudit(actor, active ? 'user.reactivated' : 'user.suspended', users[idx].email);
  },

  async municipalities() {
    await latency();
    return [
      {
        id: 'mun-1',
        name: 'Riverside Municipal Corporation',
        city: 'Riverside District',
        zones: 3,
        bins: 18,
        vehicles: 4,
        population: 482000,
        recyclingRate: 61.2,
        plan: 'Enterprise',
        status: 'active' as const,
      },
      {
        id: 'mun-2',
        name: 'Old Town City Council',
        city: 'Old Town',
        zones: 2,
        bins: 11,
        vehicles: 3,
        population: 236000,
        recyclingRate: 54.8,
        plan: 'Professional',
        status: 'active' as const,
      },
      {
        id: 'mun-3',
        name: 'Tech Park Special Zone Authority',
        city: 'Tech Park',
        zones: 1,
        bins: 6,
        vehicles: 2,
        population: 94000,
        recyclingRate: 68.4,
        plan: 'Starter',
        status: 'trial' as const,
      },
    ];
  },

  async categories(): Promise<{ category: WasteCategory; label: string; bin: string; binColor: string; active: boolean; lastUpdated: string }[]> {
    await latency(200, 450);
    const overrides = readLS<Record<string, boolean>>('category-toggles', {});
    return (Object.keys(CATEGORY_META) as WasteCategory[]).map((c, i) => ({
      category: c,
      label: CATEGORY_META[c].label,
      bin: CATEGORY_META[c].bin,
      binColor: CATEGORY_META[c].binColor,
      active: overrides[c] ?? true,
      lastUpdated: new Date(Date.now() - (i + 2) * 86400000).toISOString(),
    }));
  },

  async toggleCategory(category: WasteCategory, active: boolean, actor: string): Promise<void> {
    await latency(200, 400);
    const overrides = readLS<Record<string, boolean>>('category-toggles', {});
    writeLS('category-toggles', { ...overrides, [category]: active });
    adminService.logAudit(actor, active ? 'category.enabled' : 'category.disabled', CATEGORY_META[category].label);
  },

  async aiStats() {
    await latency();
    return {
      backend: 'demo-inference v1.4.2',
      architecture: 'CNN — ResNet-50 / EfficientNet-B3 (planned production model)',
      datasets: ['TrashNet', 'TACO'],
      accuracy: 94,
      avgLatencyMs: 612,
      requests24h: 1284,
      failedRequests24h: 6,
      lowConfidenceRate: 4.8,
      perCategory: [
        { category: 'Plastic', precision: 96.1, recall: 94.8, samples: 4120 },
        { category: 'Paper', precision: 93.4, recall: 92.1, samples: 2980 },
        { category: 'Organic', precision: 97.2, recall: 95.6, samples: 2410 },
        { category: 'Glass', precision: 91.8, recall: 89.4, samples: 1180 },
        { category: 'Metal', precision: 94.0, recall: 92.7, samples: 940 },
        { category: 'E-Waste', precision: 88.6, recall: 85.2, samples: 610 },
        { category: 'Mixed', precision: 82.1, recall: 79.8, samples: 1520 },
        { category: 'Other', precision: 76.4, recall: 74.1, samples: 480 },
      ],
      note: 'Demo mode. Metrics are simulated; connect VITE_AI_API_URL to report live inference statistics.',
    };
  },

  async auditLogs(): Promise<AuditLogEntry[]> {
    await latency();
    return [...seedAudit()].sort((a, b) => b.at.localeCompare(a.at));
  },

  logAudit(actor: string, action: string, target: string): AuditLogEntry {
    const entry: AuditLogEntry = { id: uid('al'), at: new Date().toISOString(), actor, action, target };
    writeLS('audit', [entry, ...seedAudit()]);
    return entry;
  },

  async platformStats() {
    await latency();
    const users = seedUsers();
    return {
      totalUsers: 1284 + users.length,
      citizens: 1240,
      workers: 28,
      municipalityAdmins: 9,
      systemAdmins: 3,
      municipalities: 3,
      zones: 3,
      classifications30d: 8964,
      reports30d: 412,
      uptime: 99.94,
      storageUsedGb: 18.4,
      storageLimitGb: 50,
    };
  },
};
