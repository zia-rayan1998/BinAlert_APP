import { useEffect, useMemo, useState } from 'react';
import { Fuel, Gauge, MapPin, Route as RouteIcon, Sparkles, Timer, Zap } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BinStatusPill } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { MapLegend, MapView } from '../../components/maps/MapView';
import type { MapMarker, MapRoute } from '../../components/maps/MapView';
import { useToast } from '../../context/ToastContext';
import { municipalityService } from '../../services/municipalityService';
import { adminService } from '../../services/adminService';
import { BIN_STATUS_META } from '../../utils/labels';
import type { Bin, CollectionRoute } from '../../types';

const ROUTE_COLORS = ['#123024', '#0ea5e9', '#f59e0b'];

export function MunicipalityRoutes() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<CollectionRoute[] | null>(null);
  const [bins, setBins] = useState<Bin[] | null>(null);
  const [vehicles, setVehicles] = useState<Awaited<ReturnType<typeof municipalityService.vehicles>> | null>(null);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState('');
  const [showOptimized, setShowOptimized] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([municipalityService.routes(), municipalityService.bins(), municipalityService.vehicles()])
      .then(([r, b, v]) => {
        if (!alive) return;
        setRoutes(r);
        setBins(b);
        setVehicles(v);
        setActiveId(r[0]?.id ?? '');
      })
      .catch(() => alive && setError('Route data could not be loaded.'));
    return () => {
      alive = false;
    };
  }, []);

  const active = useMemo(() => routes?.find((r) => r.id === activeId) ?? routes?.[0], [routes, activeId]);
  const activeBins = useMemo(
    () => (bins ?? []).filter((b) => b.zone === active?.zone),
    [bins, active],
  );

  const markers: MapMarker[] = activeBins.map((b) => ({
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    color: BIN_STATUS_META[b.status].color,
    pulse: b.status === 'critical',
    label: b.id,
    popup: (
      <div className="space-y-1">
        <p className="text-sm font-bold text-ink-950">{b.label}</p>
        <p className="ba-num text-[11px] text-ink-400">{b.id} · stop on {active?.name}</p>
        <p className="text-xs font-semibold text-ink-700">{b.fillLevel}% full</p>
        <BinStatusPill status={b.status} />
      </div>
    ),
  }));

  const routeLines: MapRoute[] = active
    ? [
        { id: `${active.id}-base`, path: active.path, color: '#94a3b8', dashed: true, weight: 3 },
        ...(showOptimized
          ? [{ id: `${active.id}-opt`, path: [...active.path].reverse(), color: ROUTE_COLORS[0], weight: 4 }]
          : []),
      ]
    : [];

  const totals = useMemo(() => {
    const all = routes ?? [];
    return {
      stops: all.reduce((s, r) => s + r.stops, 0),
      baseKm: +all.reduce((s, r) => s + r.distanceKm, 0).toFixed(1),
      optKm: +all.reduce((s, r) => s + r.optimized.distanceKm, 0).toFixed(1),
      fuel: +all.reduce((s, r) => s + r.optimized.fuelSavedL, 0).toFixed(1),
      improvement: all.length ? Math.round(all.reduce((s, r) => s + r.optimized.improvementPct, 0) / all.length) : 0,
    };
  }, [routes]);

  function runOptimization() {
    if (!active) return;
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      setShowOptimized(true);
      toast('success', `${active.name} re-optimized`, `${active.optimized.improvementPct}% shorter · ${active.optimized.fuelSavedL} L fuel saved per run.`);
      adminService.logAudit('municipality@binalert.io', 'route.optimized', `${active.id} ${active.name}`);
    }, 1400);
  }

  return (
    <>
      <PageHeader
        breadcrumb="Municipal operations"
        title="Route Optimization"
        subtitle="Compare baseline collection paths against the optimizer's suggested route for each zone."
        actions={
          <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} loading={optimizing} onClick={runOptimization} disabled={!active}>
            {optimizing ? 'Optimizing…' : 'Run optimizer'}
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard loading={!routes} label="Collection stops" value={totals.stops} icon={<MapPin className="h-5 w-5" />} hint="across all routes" />
        <StatCard loading={!routes} label="Baseline distance" value={totals.baseKm} unit="km" icon={<RouteIcon className="h-5 w-5" />} deltaTone="flat" delta="per full cycle" />
        <StatCard loading={!routes} label="Optimized distance" value={totals.optKm} unit="km" icon={<Zap className="h-5 w-5" />} delta={`${totals.improvement}% shorter`} />
        <StatCard loading={!routes} label="Fuel saved" value={totals.fuel} unit="L" icon={<Fuel className="h-5 w-5" />} delta="per cycle" />
        <StatCard loading={!routes} label="Optimization gain" value={totals.improvement} unit="%" icon={<Gauge className="h-5 w-5" />} delta="route efficiency" />
      </div>

      {error ? (
        <div className="mt-6"><ErrorState body={error} /></div>
      ) : !routes || !active ? (
        <Card className="mt-6"><Skeleton className="h-[28rem] w-full" /></Card>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2" padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-ink-950">{active.name}</h2>
                <p className="mt-0.5 text-sm text-ink-500">{active.zone} · {active.stops} stops · vehicle {vehicles?.find((v) => v.routeId === active.id)?.name ?? 'unassigned'}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-700">
                <input
                  type="checkbox"
                  checked={showOptimized}
                  onChange={(e) => setShowOptimized(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-forest-700 focus:ring-emerald2-500"
                />
                Show optimized route
              </label>
            </div>
            <div className="p-5">
              <MapLegend
                items={[
                  { color: '#94a3b8', label: 'Baseline route' },
                  { color: ROUTE_COLORS[0], label: 'Optimized route' },
                  ...(Object.keys(BIN_STATUS_META) as (keyof typeof BIN_STATUS_META)[]).map((s) => ({
                    color: BIN_STATUS_META[s].color,
                    label: BIN_STATUS_META[s].label,
                  })),
                ]}
              />
              <div className="mt-4">
                <MapView center={[activeBins[0]?.lat ?? 17.39, activeBins[0]?.lng ?? 78.49]} zoom={13} height="30rem" markers={markers} routes={routeLines} />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Route selection" subtitle="Pick a zone to compare" icon={<RouteIcon className="h-5 w-5" />} />
              <ul className="space-y-2">
                {routes.map((r, i) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setActiveId(r.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        r.id === active.id ? 'border-forest-700 bg-forest-50 shadow-card' : 'border-ink-200 bg-white hover:border-ink-300'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink-950">{r.name}</span>
                        <Badge className="bg-ink-100 text-ink-600 border-ink-200">{r.id}</Badge>
                      </span>
                      <span className="mt-1 block text-xs text-ink-400">{r.zone} · {r.stops} stops</span>
                      <span className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald2-600">
                        <Zap className="h-3.5 w-3.5" /> {r.optimized.improvementPct}% shorter
                      </span>
                      <ProgressBar value={r.optimized.improvementPct * 3} tone="forest" className="mt-2 !h-1" label={`${r.name} optimization`} />
                      <span className="sr-only">route {i + 1}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Baseline vs optimized" subtitle={active.name} />
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-2 text-ink-500"><RouteIcon className="h-4 w-4" /> Distance</dt>
                  <dd className="ba-num font-bold text-ink-900">{active.distanceKm} km → <span className="text-emerald2-600">{active.optimized.distanceKm} km</span></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-2 text-ink-500"><Timer className="h-4 w-4" /> Duration</dt>
                  <dd className="ba-num font-bold text-ink-900">{active.durationMin} min → <span className="text-emerald2-600">{active.optimized.durationMin} min</span></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-2 text-ink-500"><Fuel className="h-4 w-4" /> Fuel</dt>
                  <dd className="ba-num font-bold text-ink-900">-{active.optimized.fuelSavedL} L / run</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-2 text-ink-500"><MapPin className="h-4 w-4" /> Stops</dt>
                  <dd className="ba-num font-bold text-ink-900">{active.stops}</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <p className="ba-label text-emerald-700">Optimization</p>
                <p className="ba-num mt-1 text-2xl font-extrabold text-emerald-900">{active.optimized.improvementPct}%</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  Priority stops ({activeBins.filter((b) => b.status === 'critical' || b.status === 'high').length}) are sequenced first; low-fill bins are deferred to the next cycle.
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Priority stops" subtitle="Sequenced first by the optimizer" />
              <ul className="space-y-2.5">
                {activeBins
                  .slice()
                  .sort((a, b) => b.fillLevel - a.fillLevel)
                  .slice(0, 5)
                  .map((b, i) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5 ring-1 ring-ink-100">
                      <span className="ba-num grid h-6 w-6 shrink-0 place-items-center rounded-md bg-forest-800 text-[11px] font-bold text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink-900">{b.label}</span>
                        <span className="block text-[11px] text-ink-400">{b.id} · {b.fillLevel}% full</span>
                      </span>
                      <BinStatusPill status={b.status} />
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
