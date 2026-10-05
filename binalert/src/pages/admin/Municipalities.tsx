import { useEffect, useState } from 'react';
import { Building2, MapPin, Recycle, Trash2, Truck, Users } from 'lucide-react';
import { Card, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, SkeletonRows } from '../../components/ui/Feedback';
import { adminService } from '../../services/adminService';
import { formatNumber } from '../../utils/format';

type Municipality = Awaited<ReturnType<typeof adminService.municipalities>>[number];

export function AdminMunicipalities() {
  const [list, setList] = useState<Municipality[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .municipalities()
      .then(setList)
      .catch(() => setError('Tenant directory could not be loaded.'));
  }, []);

  const totals = (list ?? []).reduce(
    (acc, m) => ({
      population: acc.population + m.population,
      bins: acc.bins + m.bins,
      vehicles: acc.vehicles + m.vehicles,
      zones: acc.zones + m.zones,
    }),
    { population: 0, bins: 0, vehicles: 0, zones: 0 },
  );

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="Municipalities"
        subtitle="Onboarded tenants, their service footprint and subscription tier."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!list} label="Tenants" value={list?.length ?? ''} icon={<Building2 className="h-5 w-5" />} delta="2 active · 1 trial" deltaTone="flat" />
        <StatCard loading={!list} label="Population served" value={formatNumber(totals.population)} icon={<Users className="h-5 w-5" />} hint="across all tenants" />
        <StatCard loading={!list} label="Zones" value={totals.zones} icon={<MapPin className="h-5 w-5" />} deltaTone="flat" delta="operational areas" />
        <StatCard loading={!list} label="Bins & vehicles" value={`${totals.bins} / ${totals.vehicles}`} icon={<Truck className="h-5 w-5" />} deltaTone="flat" delta="monitored assets" />
      </div>

      {error ? (
        <div className="mt-6"><ErrorState body={error} /></div>
      ) : !list ? (
        <Card className="mt-6"><SkeletonRows rows={4} /></Card>
      ) : (
        <ul className="mt-6 grid gap-5 xl:grid-cols-3">
          {list.map((m) => (
            <li key={m.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold leading-snug text-ink-950">{m.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-400">{m.city}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      m.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }
                  >
                    {m.status === 'active' ? 'Active' : 'Trial'}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <dt className="ba-label">Population</dt>
                    <dd className="ba-num mt-0.5 text-base font-extrabold text-ink-900">{formatNumber(m.population)}</dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <dt className="ba-label">Zones</dt>
                    <dd className="ba-num mt-0.5 text-base font-extrabold text-ink-900">{m.zones}</dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <dt className="ba-label flex items-center gap-1"><Trash2 className="h-3 w-3" /> Bins</dt>
                    <dd className="ba-num mt-0.5 text-base font-extrabold text-ink-900">{m.bins}</dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                    <dt className="ba-label flex items-center gap-1"><Truck className="h-3 w-3" /> Vehicles</dt>
                    <dd className="ba-num mt-0.5 text-base font-extrabold text-ink-900">{m.vehicles}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink-600">
                      <Recycle className="h-3.5 w-3.5" /> Recycling rate
                    </span>
                    <span className="ba-num font-bold text-ink-900">{m.recyclingRate}%</span>
                  </div>
                  <ProgressBar value={m.recyclingRate} tone={m.recyclingRate > 60 ? 'emerald' : 'amber'} label={`${m.name} recycling rate`} />
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <Badge className="bg-ink-100 text-ink-700 border-ink-200">{m.plan}</Badge>
                  <span className="ba-num text-[11px] text-ink-400">{m.id}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
