import type { Bin, BinStatus, CollectionRoute, CollectionRun, CollectionVehicle, MunicipalityKpis, WasteReport } from '../types';
import { DEMO_BINS, DEMO_ROUTES, DEMO_RUNS, DEMO_VEHICLES } from './demoData';
import { latency, readLS, writeLS } from './storage';

function seedBins(): Bin[] {
  const existing = readLS<Bin[] | null>('bins', null);
  if (existing) return existing;
  writeLS('bins', DEMO_BINS);
  return [...DEMO_BINS];
}

export const municipalityService = {
  async kpis(): Promise<MunicipalityKpis> {
    await latency();
    const reports = readLS<WasteReport[]>('reports', []);
    const bins = seedBins();
    const overflowing = bins.filter((b) => b.status === 'critical').length;
    const active = reports.filter((r) => r.status !== 'resolved').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return {
      totalReports: 141 + reports.length,
      activeReports: 27 + active,
      resolvedReports: 114 + resolved,
      overflowingBins: overflowing,
      collectionEfficiency: 91.4,
      recyclingRate: 61.2,
      wasteDivertedKg: 48230,
      landfillReductionPct: 18.6,
    };
  },

  async bins(zone?: string | 'all'): Promise<Bin[]> {
    await latency();
    let bins = seedBins();
    if (zone && zone !== 'all') bins = bins.filter((b) => b.zone === zone);
    return bins;
  },

  async setBinStatus(id: string, status: BinStatus, fillLevel?: number): Promise<Bin> {
    await latency(250, 500);
    const bins = seedBins();
    const idx = bins.findIndex((b) => b.id === id);
    bins[idx] = {
      ...bins[idx],
      status,
      fillLevel: fillLevel ?? bins[idx].fillLevel,
      lastCollectedAt: status === 'normal' ? new Date().toISOString() : bins[idx].lastCollectedAt,
    };
    writeLS('bins', bins);
    return bins[idx];
  },

  async workers(): Promise<{ id: string; name: string; zone: string; openLoad: number; status: 'available' | 'on-route' | 'off-shift' }[]> {
    await latency(150, 350);
    return [
      { id: 'w-1', name: 'Ravi Kumar', zone: 'Zone A — Riverside', openLoad: 2, status: 'on-route' },
      { id: 'w-2', name: 'S. Prakash', zone: 'Zone B — Old Town', openLoad: 1, status: 'on-route' },
      { id: 'w-3', name: 'A. Reddy', zone: 'Zone C — Tech Park', openLoad: 0, status: 'available' },
      { id: 'w-4', name: 'Fatima Sheikh', zone: 'Zone A — Riverside', openLoad: 3, status: 'available' },
      { id: 'w-5', name: 'Vikram Joshi', zone: 'Zone B — Old Town', openLoad: 0, status: 'off-shift' },
    ];
  },

  async vehicles(): Promise<CollectionVehicle[]> {
    await latency();
    return [...DEMO_VEHICLES];
  },

  async runs(): Promise<CollectionRun[]> {
    await latency();
    return [...DEMO_RUNS].sort((a, b) => b.date.localeCompare(a.date));
  },

  async routes(): Promise<CollectionRoute[]> {
    await latency();
    return [...DEMO_ROUTES];
  },

  async citizens(): Promise<{ name: string; zone: string; reports: number; classifications: number; points: number; level: number }[]> {
    await latency();
    return [
      { name: 'Priya Nair', zone: 'Zone B — Old Town', reports: 21, classifications: 96, points: 4820, level: 9 },
      { name: 'Arjun Mehta', zone: 'Zone C — Tech Park', reports: 18, classifications: 81, points: 3960, level: 8 },
      { name: 'Sana Qureshi', zone: 'Zone A — Riverside', reports: 15, classifications: 64, points: 3110, level: 7 },
      { name: 'Alex Fernandes', zone: 'Zone A — Riverside', reports: 12, classifications: 52, points: 2450, level: 6 },
      { name: 'Dev Patel', zone: 'Zone B — Old Town', reports: 10, classifications: 44, points: 2210, level: 6 },
      { name: 'Lakshmi Rao', zone: 'Zone C — Tech Park', reports: 8, classifications: 37, points: 1875, level: 5 },
    ];
  },

  async recyclingCenters(): Promise<{ name: string; zone: string; lat: number; lng: number; accepts: string[]; throughputKgDay: number }[]> {
    await latency();
    return [
      { name: 'Riverside MRF', zone: 'Zone A — Riverside', lat: 17.3875, lng: 78.4758, accepts: ['Plastic', 'Paper', 'Metal', 'Glass'], throughputKgDay: 4200 },
      { name: 'Old Town Compost Hub', zone: 'Zone B — Old Town', lat: 17.3726, lng: 78.4934, accepts: ['Organic'], throughputKgDay: 2600 },
      { name: 'Tech Park E-Waste Point', zone: 'Zone C — Tech Park', lat: 17.4072, lng: 78.5051, accepts: ['E-Waste', 'Metal'], throughputKgDay: 900 },
    ];
  },
};
