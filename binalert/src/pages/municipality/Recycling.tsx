import { useEffect, useMemo, useState } from 'react';
import { Factory, Leaf, MapPin, Recycle, Scale, Truck } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge, CategoryChip } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { MapLegend, MapView } from '../../components/maps/MapView';
import type { MapMarker } from '../../components/maps/MapView';
import { CategoryDonut } from '../../components/charts/Charts';
import { analyticsService } from '../../services/analyticsService';
import { municipalityService } from '../../services/municipalityService';
import { formatNumber } from '../../utils/format';
import { CATEGORY_META } from '../../utils/labels';
import type { WasteCategory } from '../../types';

type Center = Awaited<ReturnType<typeof municipalityService.recyclingCenters>>[number];

const RECYCLABLE: WasteCategory[] = ['plastic', 'paper', 'glass', 'metal', 'organic', 'e-waste'];

export function MunicipalityRecycling() {
  const [centers, setCenters] = useState<Center[] | null>(null);
  const [distribution, setDistribution] = useState<{ category: string; value: number; pct?: number }[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([municipalityService.recyclingCenters(), analyticsService.categoryDistribution()])
      .then(([c, d]) => {
        if (!alive) return;
        setCenters(c);
        setDistribution(d);
      })
      .catch(() => alive && setError('Recycling data could not be loaded.'));
    return () => {
      alive = false;
    };
  }, []);

  const throughput = useMemo(() => (centers ?? []).reduce((s, c) => s + c.throughputKgDay, 0), [centers]);

  const markers: MapMarker[] = (centers ?? []).map((c) => ({
    id: c.name,
    lat: c.lat,
    lng: c.lng,
    color: '#10b981',
    label: c.name,
    popup: (
      <div className="space-y-1">
        <p className="text-sm font-bold text-ink-950">{c.name}</p>
        <p className="text-[11px] text-ink-400">{c.zone}</p>
        <p className="text-xs font-semibold text-ink-700">{formatNumber(c.throughputKgDay)} kg/day capacity</p>
        <p className="text-[11px] text-ink-500">Accepts: {c.accepts.join(', ')}</p>
      </div>
    ),
  }));

  return (
    <>
      <PageHeader
        breadcrumb="Municipal intelligence"
        title="Recycling & Recovery"
        subtitle="Material recovery facilities, accepted streams and diversion performance."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!centers} label="Recovery facilities" value={centers?.length ?? ''} icon={<Factory className="h-5 w-5" />} hint="MRF + compost + e-waste" />
        <StatCard loading={!centers} label="Daily throughput" value={formatNumber(throughput)} unit="kg" icon={<Scale className="h-5 w-5" />} delta="+4.1% MoM" />
        <StatCard loading={!centers} label="Recycling rate" value="61.2" unit="%" icon={<Recycle className="h-5 w-5" />} delta="+1.8 pts" />
        <StatCard loading={!centers} label="CO₂e avoided" value="128.4" unit="t" icon={<Leaf className="h-5 w-5" />} delta="rolling 12 months" />
      </div>

      {error ? (
        <div className="mt-6"><ErrorState body={error} /></div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2" padded={false}>
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-base font-bold text-ink-950">Facility network</h2>
              <p className="mt-0.5 text-sm text-ink-500">Where recovered material is processed</p>
            </div>
            <div className="space-y-4 p-5">
              <MapLegend items={[{ color: '#10b981', label: 'Recovery facility' }]} />
              {!centers ? (
                <Skeleton className="h-[22rem] w-full" />
              ) : (
                <MapView center={[17.389, 78.491]} zoom={12} height="22rem" markers={markers} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recovered streams" subtitle="Share of classified material" icon={<Recycle className="h-5 w-5" />} />
            {distribution ? <CategoryDonut data={distribution} /> : <Skeleton className="h-64 w-full" />}
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="Facilities" subtitle="Capacity, accepted material and utilisation" />
            {!centers ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ul className="space-y-4">
                {centers.map((c) => (
                  <li key={c.name} className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-950">{c.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
                          <MapPin className="h-3 w-3" />{c.zone}
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Truck className="h-3 w-3" /> {formatNumber(c.throughputKgDay)} kg/day
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.accepts.map((a) => {
                        const match = RECYCLABLE.find((r) => CATEGORY_META[r].label.toLowerCase() === a.toLowerCase());
                        return match ? (
                          <CategoryChip key={a} category={match} />
                        ) : (
                          <Badge key={a} className="bg-white text-ink-600 border-ink-200">{a}</Badge>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-600">Capacity utilisation</span>
                        <span className="ba-num font-bold text-ink-900">{Math.round((c.throughputKgDay / 5000) * 100)}%</span>
                      </div>
                      <ProgressBar value={(c.throughputKgDay / 5000) * 100} tone={c.throughputKgDay > 4000 ? 'amber' : 'emerald'} label={`${c.name} utilisation`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Diversion targets" subtitle="Current performance against 2027 goals" />
            <ul className="space-y-4">
              {[
                { label: 'Recycling rate', value: 61.2, target: 75 },
                { label: 'Organic composting', value: 48.6, target: 65 },
                { label: 'E-waste capture', value: 33.1, target: 50 },
                { label: 'Landfill diversion', value: 18.6, target: 30 },
              ].map((t) => (
                <li key={t.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">{t.label}</span>
                    <span className="ba-num font-bold text-ink-900">{t.value}% <span className="font-medium text-ink-400">/ {t.target}%</span></span>
                  </div>
                  <ProgressBar value={(t.value / t.target) * 100} tone={t.value / t.target > 0.8 ? 'emerald' : 'amber'} label={`${t.label} progress`} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
