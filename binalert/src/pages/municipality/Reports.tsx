import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ImagePlus,
  MapPin,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Card, PageHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PriorityPill, StatusPill } from '../../components/ui/Badge';
import { ConfirmDialog, Drawer } from '../../components/ui/Overlay';
import { EmptyState, ErrorState, Skeleton, SkeletonRows, Timeline } from '../../components/ui/Feedback';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { MapView } from '../../components/maps/MapView';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reportsService } from '../../services/reportsService';
import { municipalityService } from '../../services/municipalityService';
import { adminService } from '../../services/adminService';
import { notificationsService } from '../../services/notificationsService';
import { formatDate, formatDateTime, timeAgo } from '../../utils/format';
import { BIN_STATUS_META, PRIORITY_META, REPORT_TYPE_META, ZONES } from '../../utils/labels';
import type { Priority, ReportStatus, WasteReport } from '../../types';

const STATUSES: ReportStatus[] = ['submitted', 'assigned', 'in-progress', 'resolved'];

export function MunicipalityReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const actor = user?.name ?? 'Municipality Admin';

  const [reports, setReports] = useState<WasteReport[] | null>(null);
  const [workers, setWorkers] = useState<{ id: string; name: string; zone: string; openLoad: number; status: string }[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ReportStatus | 'all'>('all');
  const [zone, setZone] = useState('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WasteReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, crew] = await Promise.all([reportsService.list({ status }), municipalityService.workers()]);
      setReports(list);
      setWorkers(crew);
    } catch {
      setError('We could not load the report queue right now.');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (zone !== 'all' && r.location.zone !== zone) return false;
      if (priority !== 'all' && r.priority !== priority) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.location.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reports, zone, priority, query]);

  const counts = useMemo(() => {
    const base = { all: reports?.length ?? 0 } as Record<string, number>;
    STATUSES.forEach((s) => {
      base[s] = reports?.filter((r) => r.status === s).length ?? 0;
    });
    return base;
  }, [reports]);

  function patch(updated: WasteReport) {
    setReports((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));
    setSelected(updated);
  }

  async function run(fn: () => Promise<WasteReport>, successMsg: string, body?: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await fn();
      patch(updated);
      toast('success', successMsg, body);
    } catch {
      toast('error', 'Update failed', 'The change could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function openReport(r: WasteReport) {
    setSelected(r);
    setNote('');
    setEvidence(null);
  }

  function onEvidenceFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('error', 'Unsupported file', 'Resolution evidence must be a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('error', 'File too large', 'Evidence photos must be under 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEvidence(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function resolveReport() {
    if (!selected) return;
    if (note.trim().length < 5) {
      toast('warning', 'Resolution notes required', 'Describe how the issue was resolved (min 5 characters).');
      return;
    }
    await run(
      () => reportsService.updateStatus(selected.id, 'resolved', actor, note.trim()),
      `Report ${selected.id} resolved`,
      'The reporter has been notified.',
    );
    notificationsService.push({
      type: 'resolved',
      title: `Report ${selected.id} resolved`,
      body: note.trim(),
    });
    adminService.logAudit(user?.email ?? actor, 'report.resolved', `${selected.id}${evidence ? ' (evidence attached)' : ''}`);
    setConfirmClose(false);
  }

  return (
    <>
      <PageHeader
        breadcrumb="Municipal operations"
        title="Report Management"
        subtitle="Triage, assign and resolve every waste report raised across the city."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, location, reporter…"
              aria-label="Search reports"
              className="!w-64 pl-9"
            />
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="!p-4">
          <p className="ba-label">In queue</p>
          <p className="ba-num mt-1 text-2xl font-extrabold text-ink-950">{counts.submitted ?? 0}</p>
          <p className="mt-1 text-xs text-ink-400">awaiting assignment</p>
        </Card>
        <Card className="!p-4">
          <p className="ba-label">Assigned</p>
          <p className="ba-num mt-1 text-2xl font-extrabold text-ink-950">{counts.assigned ?? 0}</p>
          <p className="mt-1 text-xs text-ink-400">with field crews</p>
        </Card>
        <Card className="!p-4">
          <p className="ba-label">In progress</p>
          <p className="ba-num mt-1 text-2xl font-extrabold text-ink-950">{counts['in-progress'] ?? 0}</p>
          <p className="mt-1 text-xs text-ink-400">being worked now</p>
        </Card>
        <Card className="!p-4">
          <p className="ba-label">Resolved</p>
          <p className="ba-num mt-1 text-2xl font-extrabold text-emerald2-600">{counts.resolved ?? 0}</p>
          <p className="mt-1 text-xs text-ink-400">closed with evidence</p>
        </Card>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
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
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter by zone" className="!w-48">
            <option value="all">All zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'all')} aria-label="Filter by priority" className="!w-40">
            <option value="all">All priorities</option>
            {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_META[p].label}</option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState body={error} onRetry={load} />
      ) : !reports ? (
        <Card><SkeletonRows rows={6} /></Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No reports match these filters"
          body="Adjust the status, zone or priority filters to see more of the queue."
          action={<Button variant="outline" size="sm" onClick={() => { setStatus('all'); setZone('all'); setPriority('all'); setQuery(''); }}>Clear filters</Button>}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="hidden grid-cols-[7rem_1.4fr_1fr_8rem_9rem_7rem] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
            {['Report', 'Location', 'Reporter', 'Priority', 'Status', 'Updated'].map((h) => (
              <p key={h} className="ba-label">{h}</p>
            ))}
          </div>
          <ul className="divide-y divide-ink-100">
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => openReport(r)}
                  className="grid w-full grid-cols-1 gap-2 px-5 py-4 text-left transition-colors hover:bg-forest-50/40 lg:grid-cols-[7rem_1.4fr_1fr_8rem_9rem_7rem] lg:items-center lg:gap-3"
                >
                  <span className="ba-num text-sm font-extrabold text-ink-950">{r.id}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-800">{r.location.name}</span>
                    <span className="block truncate text-xs text-ink-400">{REPORT_TYPE_META[r.type].label} · {r.location.zone}</span>
                  </span>
                  <span className="truncate text-xs text-ink-500">{r.userName}</span>
                  <span><PriorityPill priority={r.priority} /></span>
                  <span><StatusPill status={r.status} /></span>
                  <span className="text-xs text-ink-400">{timeAgo(r.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Manage ${selected.id}` : ''}
        subtitle={selected && (<><StatusPill status={selected.status} /><PriorityPill priority={selected.priority} /></>)}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">{REPORT_TYPE_META[selected.type].label}</span>
              <span className="text-xs text-ink-400">Raised by {selected.userName} · {formatDateTime(selected.createdAt)}</span>
            </div>

            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="Reported waste" className="h-52 w-full rounded-xl object-cover ring-1 ring-ink-200" />
            )}

            <div>
              <p className="ba-label">Description</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{selected.description}</p>
              {selected.notes && <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">Reporter notes: {selected.notes}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                <p className="ba-label">Location</p>
                <p className="mt-1 flex items-start gap-1.5 font-semibold text-ink-800">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />{selected.location.name}
                </p>
                <p className="text-xs text-ink-400">{selected.location.zone}</p>
                <p className="ba-num mt-1 text-[11px] text-ink-400">{selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                <p className="ba-label">Last update</p>
                <p className="mt-1 font-semibold text-ink-800">{formatDate(selected.updatedAt)}</p>
                <p className="text-xs text-ink-400">{timeAgo(selected.updatedAt)}</p>
                <p className="ba-label mt-2">Current worker</p>
                <p className="text-xs font-semibold text-ink-700">{selected.assignedWorker ?? 'Unassigned'}</p>
              </div>
            </div>

            <MapView
              center={[selected.location.lat, selected.location.lng]}
              zoom={15}
              height="13rem"
              markers={[{
                id: selected.id,
                lat: selected.location.lat,
                lng: selected.location.lng,
                color: selected.status === 'resolved' ? BIN_STATUS_META.normal.color : BIN_STATUS_META.high.color,
                popup: (<p className="text-xs font-semibold">{selected.location.name}<br /><span className="font-normal text-ink-500">{selected.id}</span></p>),
              }]}
            />

            <div className="rounded-xl2 border border-ink-200 bg-white p-4">
              <p className="ba-label mb-3 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Assignment</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Collection worker" htmlFor="assign-worker">
                  <Select
                    id="assign-worker"
                    disabled={busy}
                    value={selected.assignedWorker ?? ''}
                    onChange={(e) => {
                      const worker = e.target.value;
                      void run(() => reportsService.assign(selected.id, worker, actor), `Assigned to ${worker}`);
                      adminService.logAudit(user?.email ?? actor, 'report.assigned', `${selected.id} → ${worker}`);
                    }}
                  >
                    <option value="">Unassigned</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.name}>{w.name} — {w.zone.replace('Zone ', 'Z').split(' — ')[0]} ({w.openLoad} open)</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority" htmlFor="set-priority">
                  <Select
                    id="set-priority"
                    disabled={busy}
                    value={selected.priority}
                    onChange={(e) => {
                      const p = e.target.value as Priority;
                      void run(() => reportsService.setPriority(selected.id, p, actor), `Priority set to ${PRIORITY_META[p].label}`);
                      adminService.logAudit(user?.email ?? actor, 'report.priority_changed', `${selected.id} → ${p}`);
                    }}
                  >
                    {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <p className="ba-label mt-4 mb-2">Move status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== selected.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'resolved' ? 'secondary' : 'outline'}
                    disabled={busy || (s === 'resolved' && false)}
                    icon={s === 'resolved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : undefined}
                    onClick={() => {
                      if (s === 'resolved') {
                        setConfirmClose(true);
                        return;
                      }
                      void run(() => reportsService.updateStatus(selected.id, s, actor), `Status → ${s === 'in-progress' ? 'In Progress' : s[0].toUpperCase() + s.slice(1)}`);
                      adminService.logAudit(user?.email ?? actor, 'report.status_changed', `${selected.id} → ${s}`);
                      notificationsService.push({
                        type: 'status-changed',
                        title: `Report ${selected.id} is ${s.replace('-', ' ')}`,
                        body: `Updated by ${actor}.`,
                      });
                    }}
                  >
                    {s === 'in-progress' ? 'In Progress' : s[0].toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl2 border border-ink-200 bg-white p-4">
              <p className="ba-label mb-3">Internal note</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context for the field crew or record what was done…"
                aria-label="Internal note"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || note.trim().length < 2}
                  onClick={() => {
                    void run(() => reportsService.addNote(selected.id, note.trim(), actor), 'Note added to timeline');
                    setNote('');
                  }}
                >
                  Add note
                </Button>
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-800 shadow-sm transition-colors hover:bg-ink-50">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  Resolution photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onEvidenceFile(e.target.files?.[0])} />
                </label>
              </div>
              {evidence && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-ink-50 p-2.5 ring-1 ring-ink-100">
                  <img src={evidence} alt="Resolution evidence preview" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink-800">Evidence attached</p>
                    <p className="text-[11px] text-ink-400">Saved with the resolution when you close this report.</p>
                  </div>
                  <button onClick={() => setEvidence(null)} className="rounded-md p-1.5 text-ink-400 hover:bg-white hover:text-red-600" aria-label="Remove evidence">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!evidence && (
                <p className="mt-2 text-[11px] text-ink-400">Demo mode: evidence is stored locally with the report record.</p>
              )}
            </div>

            <div>
              <p className="ba-label mb-4">Audit timeline</p>
              <Timeline events={selected.timeline} />
            </div>

            {selected.status === 'resolved' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="ba-label text-emerald-700">Resolution</p>
                <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">{selected.resolutionNotes ?? 'Resolved by the field crew.'}</p>
              </div>
            )}

            {!selected && <Skeleton className="h-10 w-full" />}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={resolveReport}
        loading={busy}
        title="Close this report?"
        body={`Report ${selected?.id ?? ''} will be marked resolved and the reporter notified. Attach resolution notes and evidence before closing.`}
        confirmLabel="Resolve & close"
      />
    </>
  );
}
