import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Recycle, Trash2, Truck } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BinStatusPill, CategoryChip } from '../../components/ui/Badge';
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { Select } from '../../components/ui/Form';
import { MapLegend, MapView } from '../../components/maps/MapView';
import type { MapMarker } from '../../components/maps/MapView';
import { Tabs } from '../../components/ui/Misc';
import { useToast } from '../../context/ToastContext';
import { municipalityService } from '../../services/municipalityService';
import { adminService } from '../../services/adminService';
import { timeAgo } from '../../utils/format';
import { BIN_STATUS_META, ZONES } from '../../utils/labels';
import type { Bin, BinStatus } from '../../types';

const VIEW_TABS = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
];

export function MunicipalityBins() {
  const { toast } = useToast();
  const [bins, setBins] = useState<Bin[] | null>(null);
  const [error, setError] = useState('');
  const [zone, setZone] = useState('all');
  const [view, setView] = useState('map');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setBins(await municipalityService.bins());
    } catch {
      setError('Bin telemetry could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => (bins ?? []).filter((b) => zone === 'all' || b.zone === zone), [bins, zone]);

  const stats = useMemo(() => {
    const all = bins ?? [];
    return {
      total: all.length,
      critical: all.filter((b) => b.status === 'critical').length,
      attention: all.filter((b) => b.status === 'attention' || b.status === 'high').length,
      avgFill: all.length ? Math.round(all.reduce((s, b) => s + b.fillLevel, 0) / all.length) : 0,
    };
  }, [bins]);

  const markers: MapMarker[] = filtered.map((b) => ({
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    color: BIN_STATUS_META[b.status].color,
    pulse: b.status === 'critical',
    label: b.label,
    popup: (
      <div className="space-y-1.5">
        <p className="text-sm font-bold text-ink-950">{b.label}</p>
        <p className="ba-num text-[11px] text-ink-400">{b.id} · {b.zone}</p>
        <p className="text-xs font-semibold text-ink-700">{b.fillLevel}% full</p>
        <p className="text-[11px] text-ink-500">Last collected {timeAgo(b.lastCollectedAt)}</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${BIN_STATUS_META[b.status].chip}`}>
          {BIN_STATUS_META[b.status].label}
        </span>
      </div>
    ),
  }));

  async function markCollected(bin: Bin) {
    setBusyId(bin.id);
    try {
      const updated = await municipalityService.setBinStatus(bin.id, 'normal', 8);
      setBins((prev) => (prev ? prev.map((b) => (b.id === updated.id ? updated : b)) : prev));
      toast('success', `${bin.id} marked collected`, 'Fill level reset and dispatch closed.');
      adminService.logAudit('municipality@binalert.io', 'bin.collected', `${bin.id} (${bin.label})`);
    } catch {
      toast('error', 'Could not update bin', 'Please try again.');
    } finally {
      setBusyId('');
    }
  }

  async function escalate(bin: Bin, status: BinStatus) {
    setBusyId(bin.id);
    try {
      const updated = await municipalityService.setBinStatus(bin.id, status);
      setBins((prev) => (prev ? prev.map((b) => (b.id === updated.id ? updated : b)) : prev));
      toast('info', `${bin.id} escalated`, `Flagged as ${BIN_STATUS_META[status].label} for the next run.`);
      adminService.logAudit('municipality@binalert.io', 'bin.escalated', `${bin.id} → ${status}`);
    } catch {
      toast('error', 'Could not update bin', 'Please try again.');
    } finally {
      setBusyId('');
    }
  }

  const tone = (fill: number): 'emerald' | 'amber' | 'red' => (fill >= 85 ? 'red' : fill >= 60 ? 'amber' : 'emerald');

  return (
    <>
      <PageHeader
        breadcrumb="Municipal operations"
        title="Bin Network"
        subtitle="Live fill levels, status and accepted streams for every bin in the network."
        actions={
          <>
            <Select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter bins by zone" className="!w-52">
              <option value="all">All zones</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </Select>
            <Tabs tabs={VIEW_TABS} active={view} onChange={setView} />
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!bins} label="Bins monitored" value={stats.total} icon={<Trash2 className="h-5 w-5" />} hint="across all zones" />
        <StatCard loading={!bins} label="Overflowing" value={stats.critical} icon={<Recycle className="h-5 w-5" />} deltaTone={stats.critical > 0 ? 'down' : 'flat'} delta={stats.critical > 0 ? 'dispatch now' : 'all clear'} />
        <StatCard loading={!bins} label="Needs attention" value={stats.attention} icon={<MapPin className="h-5 w-5" />} hint="60%+ fill level" />
        <StatCard loading={!bins} label="Average fill" value={stats.avgFill} unit="%" icon={<Truck className="h-5 w-5" />} delta="network-wide" deltaTone="flat" />
      </div>

      {error ? (
        <div className="mt-6"><ErrorState body={error} onRetry={load} /></div>
      ) : !bins ? (
        <Card className="mt-6"><Skeleton className="h-96 w-full" /></Card>
      ) : view === 'map' ? (
        <div className="mt-6 space-y-4">
          <MapLegend items={(Object.keys(BIN_STATUS_META) as BinStatus[]).map((s) => ({ color: BIN_STATUS_META[s].color, label: BIN_STATUS_META[s].label }))} />
          <MapView
            center={[17.3905, 78.4905]}
            zoom={13}
            height="32rem"
            markers={markers}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Trash2 className="h-6 w-6" />} title="No bins in this zone" body="Select a different zone to view its bin network." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ba-num text-[11px] font-bold text-ink-400">{b.id}</p>
                    <h3 className="truncate text-sm font-bold text-ink-950">{b.label}</h3>
                    <p className="mt-0.5 truncate text-xs text-ink-400">{b.zone}</p>
                  </div>
                  <BinStatusPill status={b.status} />
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-600">Fill level</span>
                    <span className="ba-num font-bold text-ink-900">{b.fillLevel}%</span>
                  </div>
                  <ProgressBar value={b.fillLevel} tone={tone(b.fillLevel)} label={`${b.id} fill level`} />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {b.accepted.map((c) => (
                    <CategoryChip key={c} category={c} />
                  ))}
                </div>

                <p className="mt-3 text-[11px] text-ink-400">Last collected {timeAgo(b.lastCollectedAt)}</p>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === b.id}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => markCollected(b)}
                  >
                    Mark collected
                  </Button>
                  {b.status !== 'critical' && (
                    <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => escalate(b, 'critical')}>
                      Flag overflow
                    </Button>
                  )}
                  {b.status === 'critical' && (
                    <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => escalate(b, 'high')}>
                      Downgrade
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
