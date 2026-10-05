import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, MapPin, User as UserIcon } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PriorityPill, StatusPill } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Overlay';
import { EmptyState, ErrorState, SkeletonRows, Timeline } from '../../components/ui/Feedback';
import { Select } from '../../components/ui/Form';
import { MapView } from '../../components/maps/MapView';
import { useAuth } from '../../context/AuthContext';
import { reportsService } from '../../services/reportsService';
import { formatDate, formatDateTime, timeAgo } from '../../utils/format';
import { BIN_STATUS_META, REPORT_TYPE_META } from '../../utils/labels';
import type { ReportStatus, WasteReport } from '../../types';

export function Reports({ manage = false }: { manage?: boolean }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ReportStatus | 'all'>('all');
  const [selected, setSelected] = useState<WasteReport | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await reportsService.list(manage ? { status } : { userId: user?.id, status });
      setReports(list);
    } catch {
      setError('We could not load your reports right now.');
    }
  }, [manage, status, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const base = { all: reports?.length ?? 0 } as Record<string, number>;
    (['submitted', 'assigned', 'in-progress', 'resolved'] as ReportStatus[]).forEach((s) => {
      base[s] = reports?.filter((r) => r.status === s).length ?? 0;
    });
    return base;
  }, [reports]);

  return (
    <>
      <PageHeader
        breadcrumb={manage ? 'Municipal operations' : 'Citizen workspace'}
        title={manage ? 'Report Management' : 'My Reports'}
        subtitle={manage ? 'Filter, assign, prioritise and resolve every report in the city queue.' : 'Every issue you have reported, with live status and resolution evidence.'}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | 'all')} aria-label="Filter by status" className="!w-44">
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </Select>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'submitted', 'assigned', 'in-progress', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              status === s ? 'border-forest-800 bg-forest-800 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s[0].toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-70">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState body={error} onRetry={load} />
      ) : !reports ? (
        <Card><SkeletonRows rows={5} /></Card>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No reports match this filter"
          body="Try a different status, or file a new report — it takes under a minute."
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setSelected(r)}
                className="ba-card flex w-full flex-wrap items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="ba-num text-sm font-extrabold text-ink-950">{r.id}</span>
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">{REPORT_TYPE_META[r.type].label}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location.name}</span>
                    <span>{formatDate(r.createdAt)}</span>
                    <span>updated {timeAgo(r.updatedAt)}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <PriorityPill priority={r.priority} />
                  <StatusPill status={r.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Report ${selected.id}` : ''}
        subtitle={selected && (<><StatusPill status={selected.status} /><PriorityPill priority={selected.priority} /></>)}
      >
        {selected && (
          <div className="space-y-6">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="Reported waste" className="h-52 w-full rounded-xl object-cover ring-1 ring-ink-200" />
            )}
            <div>
              <p className="ba-label">Issue</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{REPORT_TYPE_META[selected.type].label}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{selected.description}</p>
              {selected.notes && <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">Notes: {selected.notes}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                <p className="ba-label">Location</p>
                <p className="mt-1 font-semibold text-ink-800">{selected.location.name}</p>
                <p className="text-xs text-ink-400">{selected.location.zone}</p>
                <p className="ba-num mt-1 text-[11px] text-ink-400">{selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                <p className="ba-label">Assigned worker</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold text-ink-800">
                  <UserIcon className="h-3.5 w-3.5 text-ink-400" />
                  {selected.assignedWorker ?? 'Unassigned'}
                </p>
                <p className="mt-2 ba-label">Submitted</p>
                <p className="text-xs font-semibold text-ink-600">{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>

            <MapView
              center={[selected.location.lat, selected.location.lng]}
              zoom={15}
              height="14rem"
              markers={[{
                id: selected.id,
                lat: selected.location.lat,
                lng: selected.location.lng,
                color: selected.status === 'resolved' ? BIN_STATUS_META.normal.color : BIN_STATUS_META.high.color,
                popup: (<p className="text-xs font-semibold">{selected.location.name}<br /><span className="font-normal text-ink-500">{selected.id}</span></p>),
              }]}
            />

            <div>
              <p className="ba-label mb-4">Timeline</p>
              <Timeline events={selected.timeline} />
            </div>

            {selected.status === 'resolved' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="ba-label text-emerald-700">Resolution</p>
                <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">{selected.resolutionNotes ?? 'Resolved by the field crew.'}</p>
              </div>
            )}

            {!manage && selected.status !== 'resolved' && (
              <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>Close</Button>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
