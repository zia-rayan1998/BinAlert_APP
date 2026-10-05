import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Leaf, PieChart as PieIcon, Recycle, Trash2 } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CategoryChip } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { Tabs } from '../../components/ui/Misc';
import {
  CategoryDonut,
  MonthlyStackedArea,
  SimpleLine,
  WeeklyBars,
  ZoneBars,
} from '../../components/charts/Charts';
import { analyticsService } from '../../services/analyticsService';
import { municipalityService } from '../../services/municipalityService';
import { reportsService } from '../../services/reportsService';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_META } from '../../utils/labels';
import { formatKg, formatPct } from '../../utils/format';
import type { MunicipalityKpis, WasteCategory, WasteReport } from '../../types';

export function MunicipalityAnalytics() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<MunicipalityKpis | null>(null);
  const [monthly, setMonthly] = useState<Record<string, string | number>[] | null>(null);
  const [zones, setZones] = useState<{ zone: string; reports: number; resolved: number; recycling: number }[] | null>(null);
  const [category, setCategory] = useState<{ category: string; value: number; pct?: number }[] | null>(null);
  const [byDay, setByDay] = useState<{ day: string; reports: number }[] | null>(null);
  const [efficiency, setEfficiency] = useState<{ month: string; efficiency: number }[] | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; classifications: number; reports: number }[] | null>(null);
  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('waste');

  useEffect(() => {
    let alive = true;
    Promise.all([
      municipalityService.kpis(),
      analyticsService.monthlySeries(),
      analyticsService.zoneComparison(),
      analyticsService.categoryDistribution(),
      analyticsService.reportsByDay(),
      analyticsService.collectionEfficiency(),
      analyticsService.weeklyActivity(),
      reportsService.list(),
    ])
      .then(([k, m, z, c, d, e, w, r]) => {
        if (!alive) return;
        setKpis(k);
        setMonthly(m);
        setZones(z);
        setCategory(c);
        setByDay(d);
        setEfficiency(e);
        setWeekly(w);
        setReports(r);
      })
      .catch(() => alive && setError('Analytics could not be loaded.'));
    return () => {
      alive = false;
    };
  }, []);

  const distribution = useMemo(() => {
    const counts = new Map<ReportTypeKey, number>();
    (reports ?? []).forEach((r) => counts.set(r.type, (counts.get(r.type) ?? 0) + 1));
    const total = (reports ?? []).length || 1;
    return [...counts.entries()]
      .map(([type, value]) => ({ type, value, pct: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [reports]);

  const landfillPct = kpis ? +(100 - kpis.recyclingRate).toFixed(1) : 0;

  function exportCsv() {
    if (!monthly) return;
    const head = Object.keys(monthly[0]).join(',');
    const rows = monthly.map((m) => Object.values(m).join(',')).join('\n');
    const blob = new Blob([`${head}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binalert-waste-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Export ready', 'binalert-waste-analytics.csv downloaded.');
  }

  return (
    <>
      <PageHeader
        breadcrumb="Municipal intelligence"
        title="Waste Analytics"
        subtitle="Category mix, generation trends, recycling performance and collection efficiency."
        actions={
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!monthly}>
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!kpis} label="Recycling rate" value={kpis ? formatPct(kpis.recyclingRate) : ''} icon={<Recycle className="h-5 w-5" />} delta="+1.8 pts MoM" />
        <StatCard loading={!kpis} label="Landfill share" value={kpis ? formatPct(landfillPct) : ''} icon={<Trash2 className="h-5 w-5" />} delta="-1.8 pts MoM" />
        <StatCard loading={!kpis} label="Waste diverted" value={kpis ? formatKg(kpis.wasteDivertedKg) : ''} icon={<Leaf className="h-5 w-5" />} delta="+6.2%" />
        <StatCard loading={!kpis} label="Collection efficiency" value={kpis ? formatPct(kpis.collectionEfficiency) : ''} icon={<BarChart3 className="h-5 w-5" />} delta="+2.4 pts" />
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: 'waste', label: 'Waste streams' },
            { id: 'reports', label: 'Reports' },
            { id: 'ops', label: 'Operations' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {error ? (
        <div className="mt-5"><ErrorState body={error} /></div>
      ) : tab === 'waste' ? (
        <div className="mt-5 grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Waste generation over time" subtitle="Monthly tonnes-equivalent by stream" icon={<PieIcon className="h-5 w-5" />} />
            {monthly ? <MonthlyStackedArea data={monthly} /> : <Skeleton className="h-[18rem] w-full" />}
          </Card>
          <Card>
            <CardHeader title="Waste by category" subtitle="Share of classified items" />
            {category ? <CategoryDonut data={category} /> : <Skeleton className="h-[16rem] w-full" />}
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="Category detail" subtitle="Volume, share and routing per stream" />
            {!category ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ul className="space-y-3">
                {category.map((c) => {
                  const meta = CATEGORY_META[c.category as WasteCategory];
                  return (
                    <li key={c.category} className="flex flex-wrap items-center gap-3">
                      <CategoryChip category={c.category as WasteCategory} />
                      <div className="min-w-[10rem] flex-1">
                        <ProgressBar value={c.pct ?? 0} tone="emerald" label={`${meta.label} share`} />
                      </div>
                      <span className="ba-num w-20 text-right text-sm font-bold text-ink-900">{c.value}</span>
                      <span className="ba-num w-12 text-right text-xs text-ink-400">{c.pct}%</span>
                      <span className="hidden w-44 truncate text-xs text-ink-400 sm:block">{meta.bin}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Diversion balance" subtitle="Recycling vs landfill" />
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-600">Recycled</span>
                  <span className="ba-num font-bold text-emerald2-600">{kpis ? formatPct(kpis.recyclingRate) : '—'}</span>
                </div>
                <ProgressBar value={kpis?.recyclingRate ?? 0} tone="emerald" label="Recycling rate" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-600">Landfill</span>
                  <span className="ba-num font-bold text-ink-700">{kpis ? formatPct(landfillPct) : '—'}</span>
                </div>
                <ProgressBar value={landfillPct} tone="amber" label="Landfill share" />
              </div>
              <div className="rounded-xl border border-forest-200 bg-forest-50 p-3.5">
                <p className="ba-label text-forest-800">Est. landfill reduction</p>
                <p className="ba-num mt-1 text-2xl font-extrabold text-forest-900">{kpis ? formatPct(kpis.landfillReductionPct) : '—'}</p>
                <p className="mt-1 text-xs text-forest-700">Versus the same quarter last year.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : tab === 'reports' ? (
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Reports by area" subtitle="Submitted, resolved and recycling rate per zone" />
            {zones ? <ZoneBars data={zones} /> : <Skeleton className="h-64 w-full" />}
          </Card>
          <Card>
            <CardHeader title="Reports by day" subtitle="Weekly submission rhythm" />
            {byDay ? (
              <ul className="space-y-3">
                {byDay.map((d) => (
                  <li key={d.day} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-bold text-ink-600">{d.day}</span>
                    <div className="flex-1"><ProgressBar value={(d.reports / 14) * 100} tone="forest" label={`${d.day} reports`} /></div>
                    <span className="ba-num w-8 text-right text-sm font-bold text-ink-900">{d.reports}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader title="Waste type distribution" subtitle="Issue mix across the municipal report queue" />
            {!reports ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {distribution.map((d) => (
                  <li key={d.type} className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{d.type.replace(/-/g, ' ')}</p>
                    <p className="ba-num mt-1 text-2xl font-extrabold text-ink-950">{d.value}</p>
                    <p className="mt-1 text-xs text-ink-400">{d.pct}% of all reports</p>
                    <ProgressBar value={d.pct} tone="emerald" className="mt-2.5" label={`${d.type} share`} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Collection efficiency" subtitle="On-time completion rate, last 6 months" />
            {efficiency ? <SimpleLine data={efficiency} dataKey="efficiency" color="#123024" unit="%" /> : <Skeleton className="h-56 w-full" />}
          </Card>
          <Card>
            <CardHeader title="Citizen activity" subtitle="Classifications and reports per weekday" />
            {weekly ? <WeeklyBars data={weekly} /> : <Skeleton className="h-56 w-full" />}
          </Card>
        </div>
      )}
    </>
  );
}

type ReportTypeKey = WasteReport['type'];
