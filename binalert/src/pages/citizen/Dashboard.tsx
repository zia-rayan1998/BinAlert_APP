import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Cloud, ClipboardList, Gift, Leaf, RefreshCw, ScanLine, ArrowRight } from 'lucide-react';
import { PageHeader, StatCard, Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill, CategoryChip } from '../../components/ui/Badge';
import { EmptyState, ProgressBar, SkeletonRows } from '../../components/ui/Feedback';
import { WeeklyBars, CategoryDonut } from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { classificationsService } from '../../services/classificationsService';
import { reportsService } from '../../services/reportsService';
import { analyticsService } from '../../services/analyticsService';
import { levelInfo } from '../../services/gamificationService';
import { formatKg, timeAgo } from '../../utils/format';
import type { ClassificationResult, WasteReport } from '../../types';

export function Dashboard() {
  const { user } = useAuth();
  const [totals, setTotals] = useState<{ count: number; weightKg: number; co2SavedKg: number; divertedKg: number } | null>(null);
  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [classifications, setClassifications] = useState<ClassificationResult[] | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; classifications: number; reports: number }[] | null>(null);
  const [distribution, setDistribution] = useState<{ category: string; value: number; pct: number }[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [t, r, c, w, d] = await Promise.all([
      classificationsService.totals(user.id),
      reportsService.list({ userId: user.id }),
      classificationsService.list(user.id),
      analyticsService.weeklyActivity(),
      analyticsService.categoryDistribution(user.id),
    ]);
    setTotals(t);
    setReports(r);
    setClassifications(c);
    setWeekly(w);
    setDistribution(d);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!user) return null;
  const level = levelInfo(user.points);

  return (
    <>
      <PageHeader
        breadcrumb="Citizen workspace"
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Your sorting, reporting and environmental contribution at a glance."
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />} onClick={refresh}>
              Refresh
            </Button>
            <Link to="/classify">
              <Button variant="secondary" icon={<Camera className="h-4 w-4" />}>Classify Waste</Button>
            </Link>
          </>
        }
      />

      {/* Level / score strip */}
      <Card className="mb-6 overflow-hidden !p-0">
        <div className="grid gap-0 md:grid-cols-3">
          <div className="bg-forest-950 p-6 text-white">
            <p className="ba-label text-forest-100/50">Environmental score</p>
            <p className="ba-num mt-2 text-4xl font-extrabold text-emerald2-400">{user.ecoScore}</p>
            <p className="mt-1 text-xs text-forest-100/60">out of 100 · updates with verified actions</p>
          </div>
          <div className="border-b border-ink-100 p-6 md:border-b-0 md:border-r">
            <p className="ba-label">Current points</p>
            <p className="ba-num mt-2 text-4xl font-extrabold text-ink-950">{user.points.toLocaleString()}</p>
            <div className="mt-3 flex items-center gap-2">
              <ProgressBar value={level.progress} className="flex-1" label="Progress to next level" />
              <span className="text-[11px] font-bold text-ink-500">{Math.round(level.progress)}%</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              {level.next ? `${(level.next.minPoints - user.points).toLocaleString()} pts to ${level.next.name}` : 'Max level reached'}
            </p>
          </div>
          <div className="p-6">
            <p className="ba-label">Current level</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald2-400 to-forest-700 text-lg font-extrabold text-white shadow-glow">
                {user.level}
              </span>
              <div>
                <p className="text-lg font-extrabold text-ink-950">{level.current.name}</p>
                <p className="text-xs text-ink-400">{user.badges.length} badges earned</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!totals} label="Waste Classified" value={totals ? formatKg(totals.weightKg) : ''} icon={<ScanLine className="h-5 w-5" />} hint={totals ? `${totals.count} items` : undefined} delta={totals && totals.count > 0 ? '+2 this week' : undefined} />
        <StatCard loading={!reports} label="Reports Submitted" value={reports?.length ?? ''} icon={<ClipboardList className="h-5 w-5" />} hint={reports ? `${reports.filter((r) => r.status === 'resolved').length} resolved` : undefined} />
        <StatCard loading={!totals} label="Waste Diverted" value={totals ? formatKg(totals.divertedKg) : ''} icon={<Leaf className="h-5 w-5" />} delta="+6.2%" deltaTone="up" />
        <StatCard label="Eco Points" value={user.points.toLocaleString()} icon={<Gift className="h-5 w-5" />} delta={`Level ${user.level}`} deltaTone="flat" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Weekly Activity" subtitle="Classifications and reports over the last 7 days" icon={<Cloud className="h-5 w-5" />} />
          {weekly ? <WeeklyBars data={weekly} /> : <SkeletonRows rows={4} />}
        </Card>
        <Card>
          <CardHeader title="Waste Classification Chart" subtitle="Your material mix" icon={<ScanLine className="h-5 w-5" />} />
          {distribution === null ? (
            <SkeletonRows rows={4} />
          ) : distribution.length === 0 ? (
            <EmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title="No classifications yet"
              body="Classify your first item to see your material mix."
              action={<Link to="/classify"><Button size="sm" variant="secondary">Classify now</Button></Link>}
            />
          ) : (
            <CategoryDonut data={distribution} />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent Reports"
            subtitle="Latest issues you've reported"
            icon={<ClipboardList className="h-5 w-5" />}
            action={<Link to="/reports" className="inline-flex items-center gap-1 text-sm font-bold text-emerald2-600 hover:text-forest-700">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          {!reports ? (
            <SkeletonRows rows={3} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No reports yet"
              body="Spotted an overflowing bin or illegal dumping? File a report in under a minute."
              action={<Link to="/report"><Button size="sm" variant="secondary">Report waste</Button></Link>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {reports.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link to="/reports" className="flex items-center gap-4 py-3.5 transition-colors hover:bg-ink-50/60">
                    <span className="ba-num rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs font-bold text-ink-700">{r.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{r.location.name}</span>
                      <span className="block truncate text-xs text-ink-400">{timeAgo(r.createdAt)} · {r.location.zone}</span>
                    </span>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Environmental Impact" subtitle="Your cumulative contribution" icon={<Leaf className="h-5 w-5" />} />
          <div className="space-y-4">
            {[
              { label: 'CO₂e avoided', value: totals ? `${totals.co2SavedKg} kg` : '—', pct: 68 },
              { label: 'Landfill diverted', value: totals ? formatKg(totals.divertedKg) : '—', pct: 54 },
              { label: 'Recyclables recovered', value: totals ? formatKg(totals.weightKg * 0.42) : '—', pct: 42 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-ink-600">{row.label}</span>
                  <span className="ba-num text-sm font-extrabold text-forest-800">{row.value}</span>
                </div>
                <ProgressBar value={row.pct} label={row.label} />
              </div>
            ))}
            <div className="rounded-xl bg-forest-50 p-4 ring-1 ring-forest-100">
              <p className="text-xs leading-relaxed text-forest-800">
                <strong className="font-bold">Nice work.</strong> Your verified actions this month equal the annual CO₂
                absorption of ~3 mature trees.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {classifications && classifications.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Latest Classifications" subtitle="Recent AI sorting results" icon={<ScanLine className="h-5 w-5" />} />
          <ul className="divide-y divide-ink-100">
            {classifications.slice(0, 4).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${c.binColor}18`, color: c.binColor }}>
                  <ScanLine className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{c.itemName}</span>
                  <span className="block text-xs text-ink-400">{timeAgo(c.createdAt)} · confidence {c.confidence}%</span>
                </span>
                <CategoryChip category={c.category} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
