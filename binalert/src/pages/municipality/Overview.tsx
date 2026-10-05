import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, ClipboardList, Gauge, Leaf, Recycle, Trash2, Truck } from 'lucide-react';
import { PageHeader, Card, CardHeader, StatCard } from '../../components/ui/Card';
import { BinStatusPill, StatusPill } from '../../components/ui/Badge';
import { SkeletonRows } from '../../components/ui/Feedback';
import { MonthlyStackedArea, ZoneBars } from '../../components/charts/Charts';
import { municipalityService } from '../../services/municipalityService';
import { reportsService } from '../../services/reportsService';
import { analyticsService } from '../../services/analyticsService';
import { timeAgo } from '../../utils/format';
import type { Bin, MunicipalityKpis, WasteReport } from '../../types';

export function MunicipalityOverview() {
  const [kpis, setKpis] = useState<MunicipalityKpis | null>(null);
  const [bins, setBins] = useState<Bin[] | null>(null);
  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [monthly, setMonthly] = useState<Record<string, string | number>[] | null>(null);
  const [zones, setZones] = useState<{ zone: string; reports: number; resolved: number; recycling: number }[] | null>(null);

  useEffect(() => {
    void Promise.all([
      municipalityService.kpis(),
      municipalityService.bins(),
      reportsService.list(),
      analyticsService.monthlySeries(),
      analyticsService.zoneComparison(),
    ]).then(([k, b, r, m, z]) => {
      setKpis(k);
      setBins(b);
      setReports(r);
      setMonthly(m);
      setZones(z);
    });
  }, []);

  const criticalBins = bins?.filter((b) => b.status === 'critical' || b.status === 'high') ?? [];

  return (
    <>
      <PageHeader
        breadcrumb="Municipal console"
        title="Operations Overview"
        subtitle="City-wide waste operations, live from reports, bins and fleets."
        actions={<Link to="/municipality/reports"><span className="inline-flex h-10 items-center rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700">Open report queue</span></Link>}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!kpis} label="Total Waste Reports" value={kpis?.totalReports ?? ''} icon={<ClipboardList className="h-5 w-5" />} delta="+12 this week" />
        <StatCard loading={!kpis} label="Active Reports" value={kpis?.activeReports ?? ''} icon={<Activity className="h-5 w-5" />} hint="in queue or in field" />
        <StatCard loading={!kpis} label="Resolved Reports" value={kpis?.resolvedReports ?? ''} icon={<CheckCircle2 className="h-5 w-5" />} delta="77% resolution" deltaTone="up" />
        <StatCard loading={!kpis} label="Overflowing Bins" value={kpis?.overflowingBins ?? ''} icon={<Trash2 className="h-5 w-5" />} deltaTone={kpis && kpis.overflowingBins > 2 ? 'down' : 'flat'} delta={kpis && kpis.overflowingBins > 2 ? 'needs dispatch' : 'stable'} />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!kpis} label="Collection Efficiency" value={kpis?.collectionEfficiency ?? ''} unit="%" delta="+2.4 pts" icon={<Truck className="h-5 w-5" />} />
        <StatCard loading={!kpis} label="Recycling Rate" value={kpis?.recyclingRate ?? ''} unit="%" delta="+1.8 pts" icon={<Recycle className="h-5 w-5" />} />
        <StatCard loading={!kpis} label="Waste Diverted" value={(kpis?.wasteDivertedKg ?? 0).toLocaleString()} unit="kg" icon={<Leaf className="h-5 w-5" />} delta="+6.2%" />
        <StatCard loading={!kpis} label="Est. Landfill Reduction" value={kpis?.landfillReductionPct ?? ''} unit="%" icon={<Gauge className="h-5 w-5" />} delta="vs last quarter" deltaTone="up" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Waste generation by category" subtitle="City-wide submissions, last 6 months (kg-equivalent loads)" />
          {monthly ? <MonthlyStackedArea data={monthly} /> : <SkeletonRows rows={5} />}
        </Card>
        <Card>
          <CardHeader title="Bins needing dispatch" subtitle="High fill levels across zones" icon={<Trash2 className="h-5 w-5" />} />
          {!bins ? (
            <SkeletonRows rows={4} />
          ) : (
            <ul className="space-y-3">
              {criticalBins.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-3 ring-1 ring-ink-100">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-900">{b.label}</span>
                    <span className="block text-xs text-ink-400">{b.id} · {b.fillLevel}% full · {timeAgo(b.lastCollectedAt)}</span>
                  </span>
                  <BinStatusPill status={b.status} />
                </li>
              ))}
              {criticalBins.length === 0 && <p className="text-sm text-ink-400">All bins within normal fill levels.</p>}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Zone comparison" subtitle="Reports, resolved and recycling rate" />
          {zones ? <ZoneBars data={zones} /> : <SkeletonRows rows={5} />}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader
            title="Latest reports"
            subtitle="Newest tickets across all zones"
            action={<Link to="/municipality/reports" className="text-sm font-bold text-emerald2-600 hover:text-forest-700">Manage →</Link>}
          />
          {!reports ? (
            <SkeletonRows rows={4} />
          ) : (
            <ul className="divide-y divide-ink-100">
              {reports.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="ba-num rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-700">{r.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{r.location.name}</span>
                    <span className="block text-xs text-ink-400">{r.location.zone} · {timeAgo(r.createdAt)}</span>
                  </span>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
