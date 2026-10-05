import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Card';
import { MapLegend, MapView } from '../../components/maps/MapView';
import type { MapMarker, MapRoute } from '../../components/maps/MapView';
import { Skeleton } from '../../components/ui/Feedback';
import { municipalityService } from '../../services/municipalityService';
import { reportsService } from '../../services/reportsService';
import { BIN_STATUS_META, REPORT_TYPE_META, STATUS_META } from '../../utils/labels';
import { timeAgo } from '../../utils/format';
import type { Bin, CollectionRoute, CollectionVehicle, WasteReport } from '../../types';

type LayerKey = 'reports' | 'bins' | 'vehicles' | 'routes' | 'recycling';

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'reports', label: 'Waste reports' },
  { key: 'bins', label: 'Bins' },
  { key: 'vehicles', label: 'Collection vehicles' },
  { key: 'routes', label: 'Collection routes' },
  { key: 'recycling', label: 'Recycling centers' },
];

export function MapPage() {
  const [bins, setBins] = useState<Bin[] | null>(null);
  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [vehicles, setVehicles] = useState<CollectionVehicle[] | null>(null);
  const [routes, setRoutes] = useState<CollectionRoute[] | null>(null);
  const [recycling, setRecycling] = useState<Awaited<ReturnType<typeof municipalityService.recyclingCenters>> | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ reports: true, bins: true, vehicles: true, routes: false, recycling: true });

  useEffect(() => {
    void Promise.all([
      municipalityService.bins(),
      reportsService.list(),
      municipalityService.vehicles(),
      municipalityService.routes(),
      municipalityService.recyclingCenters(),
    ]).then(([b, r, v, rt, rc]) => {
      setBins(b);
      setReports(r);
      setVehicles(v);
      setRoutes(rt);
      setRecycling(rc);
    });
  }, []);

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (layers.bins && bins) {
      bins.forEach((b) =>
        out.push({
          id: b.id,
          lat: b.lat,
          lng: b.lng,
          color: BIN_STATUS_META[b.status].color,
          pulse: b.status === 'critical',
          label: b.id,
          popup: (
            <div className="space-y-1">
              <p className="text-sm font-bold">{b.label}</p>
              <p className="text-xs text-ink-500">{b.id} · {b.zone}</p>
              <p className="text-xs font-semibold" style={{ color: BIN_STATUS_META[b.status].color }}>
                {BIN_STATUS_META[b.status].label} · {b.fillLevel}% full
              </p>
              <p className="text-[11px] text-ink-400">Last collected {timeAgo(b.lastCollectedAt)}</p>
            </div>
          ),
        }),
      );
    }
    if (layers.reports && reports) {
      reports.filter((r) => r.status !== 'resolved').forEach((r) =>
        out.push({
          id: r.id,
          lat: r.location.lat,
          lng: r.location.lng,
          color: r.priority === 'critical' ? '#ef4444' : r.priority === 'high' ? '#f97316' : '#eab308',
          pulse: r.priority === 'critical',
          popup: (
            <div className="space-y-1">
              <p className="text-sm font-bold">{REPORT_TYPE_META[r.type].label}</p>
              <p className="text-xs text-ink-500">{r.location.name}</p>
              <p className="text-xs font-semibold text-ink-700">{STATUS_META[r.status].label} · {r.priority} priority</p>
              <p className="text-[11px] text-ink-400">{r.id} · updated {timeAgo(r.updatedAt)}</p>
            </div>
          ),
        }),
      );
    }
    if (layers.recycling && recycling) {
      recycling.forEach((c) =>
        out.push({
          id: c.name,
          lat: c.lat,
          lng: c.lng,
          color: '#0ea5e9',
          label: c.name,
          popup: (
            <div className="space-y-1">
              <p className="text-sm font-bold">{c.name}</p>
              <p className="text-xs text-ink-500">{c.accepts.join(', ')}</p>
              <p className="text-[11px] text-ink-400">{c.throughputKgDay.toLocaleString()} kg/day throughput</p>
            </div>
          ),
        }),
      );
    }
    return out;
  }, [layers, bins, reports, recycling]);

  const routeLines = useMemo<MapRoute[]>(() => {
    if (!layers.routes || !routes) return [];
    return routes.map((r, i) => ({
      id: r.id,
      path: r.path,
      color: ['#10b981', '#0ea5e9', '#8b5cf6'][i % 3],
      dashed: true,
      weight: 3,
    }));
  }, [layers.routes, routes]);

  const vehicleMarkers = useMemo(() => {
    if (!layers.vehicles || !vehicles) return [];
    return vehicles
      .filter((v) => v.status === 'active')
      .map((v) => ({
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        popup: (
          <div className="space-y-1">
            <p className="text-sm font-bold">{v.name}</p>
            <p className="text-xs text-ink-500">{v.plate} · {v.driver}</p>
            <p className="text-xs font-semibold text-emerald-600">On route {v.routeId}</p>
          </div>
        ),
      }));
  }, [layers.vehicles, vehicles]);

  return (
    <>
      <PageHeader
        breadcrumb="Live city view"
        title="Interactive Map"
        subtitle="Reports, bins, vehicles, routes and recycling centres — status-coloured and live."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">
          <Layers className="h-3.5 w-3.5" /> Layers
        </span>
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
            aria-pressed={layers[l.key]}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              layers[l.key] ? 'border-forest-800 bg-forest-800 text-white' : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {!bins || !reports ? (
        <Skeleton className="h-[26rem] w-full rounded-xl2" />
      ) : (
        <MapView center={[17.3895, 78.4925]} zoom={13} markers={markers} routes={routeLines} vehicles={vehicleMarkers} height="32rem" />
      )}

      <div className="mt-4">
        <MapLegend
          items={[
            { color: BIN_STATUS_META.normal.color, label: 'Normal' },
            { color: BIN_STATUS_META.attention.color, label: 'Needs Attention' },
            { color: BIN_STATUS_META.high.color, label: 'High Priority' },
            { color: BIN_STATUS_META.critical.color, label: 'Overflowing / Critical' },
            { color: '#0ea5e9', label: 'Recycling center' },
          ]}
        />
      </div>

      <Card className="mt-6">
        <p className="text-sm leading-relaxed text-ink-500">
          <strong className="font-bold text-ink-800">How to read the map:</strong> bin markers pulse when a bin is
          overflowing. Report markers use priority colours — yellow (medium), orange (high), red (critical). Toggle
          layers above to focus on what matters; click any marker for location, waste type, status, last update and
          report ID.
        </p>
      </Card>
    </>
  );
}
