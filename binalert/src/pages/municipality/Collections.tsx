import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Truck, Users, Wrench, XCircle } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { Select } from '../../components/ui/Form';
import { MapView } from '../../components/maps/MapView';
import { Tabs } from '../../components/ui/Misc';
import { municipalityService } from '../../services/municipalityService';
import { formatDate, timeAgo } from '../../utils/format';
import type { CollectionRun, CollectionVehicle } from '../../types';

const RUN_META: Record<CollectionRun['status'], { label: string; chip: string }> = {
  scheduled: { label: 'Scheduled', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  'in-progress': { label: 'In Progress', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  completed: { label: 'Completed', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  missed: { label: 'Missed', chip: 'bg-red-50 text-red-700 border-red-200' },
};

const VEHICLE_CHIP: Record<CollectionVehicle['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  idle: 'bg-ink-50 text-ink-600 border-ink-200',
  maintenance: 'bg-amber-50 text-amber-800 border-amber-200',
};

export function MunicipalityCollections() {
  const [runs, setRuns] = useState<CollectionRun[] | null>(null);
  const [vehicles, setVehicles] = useState<CollectionVehicle[] | null>(null);
  const [workers, setWorkers] = useState<Awaited<ReturnType<typeof municipalityService.workers>> | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<CollectionRun['status'] | 'all'>('all');
  const [tab, setTab] = useState('schedule');

  const load = useCallback(async () => {
    setError('');
    try {
      const [r, v, w] = await Promise.all([
        municipalityService.runs(),
        municipalityService.vehicles(),
        municipalityService.workers(),
      ]);
      setRuns(r);
      setVehicles(v);
      setWorkers(w);
    } catch {
      setError('Collection data could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (runs ?? []).filter((r) => filter === 'all' || r.status === filter), [runs, filter]);

  const stats = useMemo(() => {
    const all = runs ?? [];
    return {
      pending: all.filter((r) => r.status === 'scheduled').length,
      active: all.filter((r) => r.status === 'in-progress').length,
      completed: all.filter((r) => r.status === 'completed').length,
      missed: all.filter((r) => r.status === 'missed').length,
    };
  }, [runs]);

  const counts = useMemo(() => {
    const base = { all: runs?.length ?? 0 } as Record<string, number>;
    (Object.keys(RUN_META) as CollectionRun['status'][]).forEach((s) => {
      base[s] = runs?.filter((r) => r.status === s).length ?? 0;
    });
    return base;
  }, [runs]);

  return (
    <>
      <PageHeader
        breadcrumb="Municipal operations"
        title="Collection Management"
        subtitle="Schedules, fleet status and crew assignment for every collection run."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value as CollectionRun['status'] | 'all')} aria-label="Filter runs" className="!w-48">
            <option value="all">All runs</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </Select>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!runs} label="Pending collections" value={stats.pending} icon={<CalendarClock className="h-5 w-5" />} hint="scheduled today" />
        <StatCard loading={!runs} label="In progress" value={stats.active} icon={<Truck className="h-5 w-5" />} delta="crews on route" deltaTone="flat" />
        <StatCard loading={!runs} label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} delta="91.4% on time" />
        <StatCard loading={!runs} label="Missed" value={stats.missed} icon={<XCircle className="h-5 w-5" />} deltaTone={stats.missed ? 'down' : 'flat'} delta={stats.missed ? 'follow-up needed' : 'none this week'} />
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: 'schedule', label: 'Schedule', count: counts.all },
            { id: 'fleet', label: 'Fleet', count: vehicles?.length ?? 0 },
            { id: 'crews', label: 'Crews', count: workers?.length ?? 0 },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {error ? (
        <div className="mt-5"><ErrorState body={error} onRetry={load} /></div>
      ) : tab === 'schedule' ? (
        !runs ? (
          <Card className="mt-5"><SkeletonRows rows={6} /></Card>
        ) : visible.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No runs with this status" body="Choose a different filter to see the collection schedule." />
          </div>
        ) : (
          <Card padded={false} className="mt-5 overflow-hidden">
            <div className="hidden grid-cols-[6rem_1.3fr_1fr_1fr_7rem_5rem_8rem] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
              {['Run', 'Route', 'Zone', 'Crew / vehicle', 'Window', 'Stops', 'Status'].map((h) => (
                <p key={h} className="ba-label">{h}</p>
              ))}
            </div>
            <ul className="divide-y divide-ink-100">
              {visible.map((r) => (
                <li key={r.id} className="grid grid-cols-1 gap-2 px-5 py-4 lg:grid-cols-[6rem_1.3fr_1fr_1fr_7rem_5rem_8rem] lg:items-center lg:gap-3">
                  <div>
                    <p className="ba-num text-sm font-extrabold text-ink-950">{r.id}</p>
                    <p className="text-[11px] text-ink-400">{formatDate(r.date)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-800">{r.routeName}</p>
                    <p className="ba-num text-[11px] text-ink-400">{r.routeId}</p>
                  </div>
                  <p className="truncate text-xs text-ink-500">{r.zone}</p>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-700">{r.worker}</p>
                    <p className="truncate text-[11px] text-ink-400">{r.vehicle}</p>
                  </div>
                  <p className="ba-num text-xs text-ink-600">{r.window}</p>
                  <p className="ba-num text-xs font-bold text-ink-700">{r.stops}</p>
                  <Badge className={RUN_META[r.status].chip}>{RUN_META[r.status].label}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )
      ) : tab === 'fleet' ? (
        !vehicles ? (
          <Card className="mt-5"><SkeletonRows rows={4} /></Card>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title="Live fleet positions" subtitle="Vehicles reporting GPS in the last 5 minutes" icon={<Truck className="h-5 w-5" />} />
              <MapView
                center={[17.3905, 78.4905]}
                zoom={12}
                height="24rem"
                vehicles={vehicles.map((v) => ({
                  id: v.id,
                  lat: v.lat,
                  lng: v.lng,
                  popup: (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-ink-950">{v.name}</p>
                      <p className="ba-num text-[11px] text-ink-400">{v.plate}</p>
                      <p className="text-xs text-ink-600">Driver: {v.driver}</p>
                      <p className="text-xs font-semibold capitalize text-ink-700">{v.status} · route {v.routeId}</p>
                    </div>
                  ),
                }))}
              />
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Vehicles" subtitle={`${vehicles.length} units registered`} />
              <ul className="space-y-3">
                {vehicles.map((v) => (
                  <li key={v.id} className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{v.name}</p>
                        <p className="ba-num text-[11px] text-ink-400">{v.plate}</p>
                      </div>
                      <Badge className={VEHICLE_CHIP[v.status]}>{v.status === 'active' ? 'Active' : v.status === 'idle' ? 'Idle' : 'Maintenance'}</Badge>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-ink-500"><Users className="h-3 w-3" />{v.driver}</span>
                      <span className="inline-flex items-center gap-1.5 text-ink-500"><Truck className="h-3 w-3" />Route {v.routeId}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )
      ) : !workers ? (
        <Card className="mt-5"><SkeletonRows rows={5} /></Card>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workers.map((w) => (
            <li key={w.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                      <Wrench className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-950">{w.name}</p>
                      <p className="truncate text-xs text-ink-400">{w.zone}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      w.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : w.status === 'on-route'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-ink-50 text-ink-600 border-ink-200'
                    }
                  >
                    {w.status === 'on-route' ? 'On route' : w.status === 'available' ? 'Available' : 'Off shift'}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <p className="ba-label">Open load</p>
                    <p className="ba-num mt-0.5 text-lg font-extrabold text-ink-900">{w.openLoad}</p>
                  </div>
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <p className="ba-label">Assigned</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-ink-800">{runs?.find((r) => r.worker === w.name)?.routeName ?? 'No active run'}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">updated {timeAgo(new Date().toISOString())}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
