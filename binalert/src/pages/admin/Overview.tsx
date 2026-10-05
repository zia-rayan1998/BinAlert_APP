import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, Cpu, Database, Gauge, Server, ShieldCheck, Users } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { SimpleLine } from '../../components/charts/Charts';
import { adminService } from '../../services/adminService';
import { formatNumber, timeAgo } from '../../utils/format';

type Stats = Awaited<ReturnType<typeof adminService.platformStats>>;

const SERVICES = [
  { name: 'Application API', detail: 'Node.js · Express · TypeScript', status: 'demo', port: 4000 },
  { name: 'AI Inference', detail: 'Python · FastAPI', status: 'demo', port: 8000 },
  { name: 'Database', detail: 'PostgreSQL · Prisma ORM', status: 'demo', port: 5432 },
  { name: 'Object storage', detail: 'Report & evidence photos', status: 'local', port: 0 },
];

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof adminService.auditLogs>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([adminService.platformStats(), adminService.auditLogs()])
      .then(([s, l]) => {
        if (!alive) return;
        setStats(s);
        setLogs(l);
      })
      .catch(() => alive && setError('Platform statistics could not be loaded.'));
    return () => {
      alive = false;
    };
  }, []);

  const uptimeSeries = [
    { label: 'May', uptime: 99.82 },
    { label: 'Jun', uptime: 99.91 },
    { label: 'Jul', uptime: 99.87 },
    { label: 'Aug', uptime: 99.95 },
    { label: 'Sep', uptime: 99.93 },
    { label: 'Oct', uptime: 99.94 },
  ];

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="Platform Overview"
        subtitle="Tenant health, user distribution and service status across the BinAlert platform."
        actions={
          <Link to="/admin/audit">
            <span className="inline-flex h-10 items-center rounded-lg border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 shadow-sm transition-colors hover:bg-ink-50">
              View audit log
            </span>
          </Link>
        }
      />

      {error ? (
        <ErrorState body={error} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard loading={!stats} label="Total users" value={stats ? formatNumber(stats.totalUsers) : ''} icon={<Users className="h-5 w-5" />} delta="+126 this month" />
            <StatCard loading={!stats} label="Municipalities" value={stats?.municipalities ?? ''} icon={<Building2 className="h-5 w-5" />} hint={`${stats?.zones ?? 0} zones onboarded`} />
            <StatCard loading={!stats} label="Classifications (30d)" value={stats ? formatNumber(stats.classifications30d) : ''} icon={<Cpu className="h-5 w-5" />} delta="+8.4%" />
            <StatCard loading={!stats} label="Reports (30d)" value={stats ? formatNumber(stats.reports30d) : ''} icon={<Activity className="h-5 w-5" />} delta="+3.1%" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="User distribution by role" subtitle="Access control across the platform" icon={<ShieldCheck className="h-5 w-5" />} />
              {!stats ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ul className="space-y-4">
                  {[
                    { label: 'Citizens', value: stats.citizens, tone: 'emerald' as const },
                    { label: 'Collection workers', value: stats.workers, tone: 'sky' as const },
                    { label: 'Municipality admins', value: stats.municipalityAdmins, tone: 'amber' as const },
                    { label: 'System admins', value: stats.systemAdmins, tone: 'forest' as const },
                  ].map((r) => (
                    <li key={r.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-700">{r.label}</span>
                        <span className="ba-num font-bold text-ink-900">{formatNumber(r.value)}</span>
                      </div>
                      <ProgressBar value={Math.min(100, (r.value / stats.totalUsers) * 100 * 1.6)} tone={r.tone} label={`${r.label} share`} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Service status" subtitle="Local development endpoints" icon={<Server className="h-5 w-5" />} />
              <ul className="space-y-3">
                {SERVICES.map((s) => (
                  <li key={s.name} className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{s.name}</p>
                        <p className="truncate text-[11px] text-ink-400">{s.detail}</p>
                      </div>
                      <Badge className={s.status === 'demo' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}>
                        {s.status === 'demo' ? 'demo data' : 'local'}
                      </Badge>
                    </div>
                    {s.port > 0 && <p className="ba-num mt-2 text-[11px] text-ink-400">localhost:{s.port}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Platform uptime" subtitle="Monthly availability across all tenants" icon={<Gauge className="h-5 w-5" />} />
              <SimpleLine data={uptimeSeries} dataKey="uptime" color="#123024" unit="%" />
            </Card>

            <Card>
              <CardHeader
                title="Recent activity"
                subtitle="Latest audited actions"
                action={<Link to="/admin/audit" className="text-sm font-bold text-emerald2-600 hover:text-forest-700">All logs →</Link>}
              />
              {!logs ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ul className="space-y-3">
                  {logs.slice(0, 6).map((l) => (
                    <li key={l.id} className="rounded-lg bg-ink-50 px-3.5 py-2.5 ring-1 ring-ink-100">
                      <p className="ba-num truncate text-xs font-bold text-ink-900">{l.action}</p>
                      <p className="truncate text-[11px] text-ink-500">{l.target}</p>
                      <p className="mt-0.5 truncate text-[10px] text-ink-400">{l.actor} · {timeAgo(l.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Resource usage" subtitle="Storage and compute footprint" icon={<Database className="h-5 w-5" />} />
            {!stats ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">Object storage</span>
                    <span className="ba-num font-bold text-ink-900">{stats.storageUsedGb} / {stats.storageLimitGb} GB</span>
                  </div>
                  <ProgressBar value={(stats.storageUsedGb / stats.storageLimitGb) * 100} tone="emerald" label="Storage usage" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">Uptime SLA</span>
                    <span className="ba-num font-bold text-ink-900">{stats.uptime}%</span>
                  </div>
                  <ProgressBar value={stats.uptime} tone="forest" label="Uptime" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">AI request success</span>
                    <span className="ba-num font-bold text-ink-900">99.5%</span>
                  </div>
                  <ProgressBar value={99.5} tone="sky" label="AI success rate" />
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
