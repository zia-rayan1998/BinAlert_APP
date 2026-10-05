import type { Priority, ReportStatus, WasteReport } from '../types';
import { DEMO_REPORTS } from './demoData';
import { latency, readLS, ServiceError, writeLS } from './storage';

function seed(): WasteReport[] {
  const existing = readLS<WasteReport[] | null>('reports', null);
  if (existing) return existing;
  writeLS('reports', DEMO_REPORTS);
  return [...DEMO_REPORTS];
}

function persist(reports: WasteReport[]) {
  writeLS('reports', reports);
}

let sequence = readLS<number>('report-seq', 149);

export interface NewReportInput {
  userId: string;
  userName: string;
  type: WasteReport['type'];
  description: string;
  location: WasteReport['location'];
  priority: Priority;
  notes: string;
  imageUrl?: string;
}

export const reportsService = {
  async list(filter?: { userId?: string; status?: ReportStatus | 'all'; zone?: string | 'all' }): Promise<WasteReport[]> {
    await latency();
    let reports = seed();
    if (filter?.userId) reports = reports.filter((r) => r.userId === filter.userId);
    if (filter?.status && filter.status !== 'all') reports = reports.filter((r) => r.status === filter.status);
    if (filter?.zone && filter.zone !== 'all') reports = reports.filter((r) => r.location.zone === filter.zone);
    return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<WasteReport> {
    await latency(150, 350);
    const report = seed().find((r) => r.id === id);
    if (!report) throw new ServiceError('not-found', 'This report no longer exists or was removed.');
    return report;
  },

  async create(input: NewReportInput): Promise<WasteReport> {
    await latency(600, 1000);
    if (!input.description.trim() || input.description.trim().length < 10) {
      throw new ServiceError('validation', 'Please describe the issue in at least 10 characters.');
    }
    const reports = seed();
    const id = `BA-2026-${String(sequence).padStart(5, '0')}`;
    sequence += 1;
    writeLS('report-seq', sequence);
    const nowIso = new Date().toISOString();
    const report: WasteReport = {
      ...input,
      id,
      status: 'submitted',
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        { status: 'created', at: nowIso, by: input.userName },
        { status: 'submitted', at: nowIso, by: 'System' },
      ],
    };
    persist([report, ...reports]);
    return report;
  },

  async updateStatus(id: string, status: ReportStatus, actor: string, note?: string): Promise<WasteReport> {
    await latency(350, 650);
    const reports = seed();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'Report not found.');
    const nowIso = new Date().toISOString();
    const report: WasteReport = {
      ...reports[idx],
      status,
      updatedAt: nowIso,
      timeline: [...reports[idx].timeline, { status, at: nowIso, by: actor, note }],
      resolutionNotes: status === 'resolved' ? note ?? reports[idx].resolutionNotes : reports[idx].resolutionNotes,
    };
    reports[idx] = report;
    persist(reports);
    return report;
  },

  async assign(id: string, worker: string, actor: string): Promise<WasteReport> {
    await latency(350, 650);
    const reports = seed();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'Report not found.');
    const nowIso = new Date().toISOString();
    const report: WasteReport = {
      ...reports[idx],
      assignedWorker: worker,
      status: reports[idx].status === 'submitted' ? 'assigned' : reports[idx].status,
      updatedAt: nowIso,
      timeline: [...reports[idx].timeline, { status: 'assigned', at: nowIso, by: actor, note: `Assigned to ${worker}` }],
    };
    reports[idx] = report;
    persist(reports);
    return report;
  },

  async setPriority(id: string, priority: Priority, actor: string): Promise<WasteReport> {
    await latency(250, 500);
    const reports = seed();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'Report not found.');
    reports[idx] = { ...reports[idx], priority, updatedAt: new Date().toISOString() };
    persist(reports);
    void actor;
    return reports[idx];
  },

  async addNote(id: string, note: string, actor: string): Promise<WasteReport> {
    await latency(250, 500);
    const reports = seed();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'Report not found.');
    const nowIso = new Date().toISOString();
    reports[idx] = {
      ...reports[idx],
      updatedAt: nowIso,
      timeline: [...reports[idx].timeline, { status: 'note', at: nowIso, by: actor, note }],
    };
    persist(reports);
    return reports[idx];
  },
};
