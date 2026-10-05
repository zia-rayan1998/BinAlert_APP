import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Download, Search, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { Input } from '../../components/ui/Form';
import { useToast } from '../../context/ToastContext';
import { adminService } from '../../services/adminService';
import { formatDateTime, timeAgo } from '../../utils/format';
import type { AuditLogEntry } from '../../types';

const ACTION_TONE: Record<string, string> = {
  'user.role_updated': 'bg-violet-50 text-violet-700 border-violet-200',
  'user.suspended': 'bg-red-50 text-red-700 border-red-200',
  'user.reactivated': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'report.assigned': 'bg-sky-50 text-sky-700 border-sky-200',
  'report.status_changed': 'bg-amber-50 text-amber-800 border-amber-200',
  'report.priority_changed': 'bg-orange-50 text-orange-700 border-orange-200',
  'report.resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'route.optimized': 'bg-forest-50 text-forest-800 border-forest-200',
  'bin.collected': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bin.escalated': 'bg-red-50 text-red-700 border-red-200',
  'category.enabled': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'category.disabled': 'bg-ink-100 text-ink-600 border-ink-200',
  'category.updated': 'bg-ink-100 text-ink-600 border-ink-200',
  'ai.model_healthcheck': 'bg-sky-50 text-sky-700 border-sky-200',
};

export function AdminAudit() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setLogs(await adminService.auditLogs());
    } catch {
      setError('Audit log could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!logs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) => l.action.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || l.target.toLowerCase().includes(q),
    );
  }, [logs, query]);

  const actors = useMemo(() => new Set((logs ?? []).map((l) => l.actor)).size, [logs]);

  function exportLog() {
    if (!logs) return;
    const rows = [['timestamp', 'actor', 'action', 'target'], ...logs.map((l) => [l.at, l.actor, l.action, l.target])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binalert-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Audit log exported', 'binalert-audit-log.csv downloaded.');
  }

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="Audit Logs"
        subtitle="Immutable record of privileged actions across every tenant."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, actor, target…" aria-label="Search audit log" className="!w-64 pl-9" />
            </div>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportLog} disabled={!logs}>Export</Button>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard loading={!logs} label="Logged events" value={logs?.length ?? ''} icon={<ClipboardList className="h-5 w-5" />} hint="retained 365 days" />
        <StatCard loading={!logs} label="Distinct actors" value={actors} icon={<ShieldCheck className="h-5 w-5" />} deltaTone="flat" delta="accounts + system" />
        <StatCard loading={!logs} label="Latest event" value={logs?.[0] ? timeAgo(logs[0].at) : ''} icon={<ClipboardList className="h-5 w-5" />} deltaTone="flat" delta={logs?.[0]?.action} />
      </div>

      {error ? (
        <div className="mt-6"><ErrorState body={error} onRetry={load} /></div>
      ) : !logs ? (
        <Card className="mt-6"><SkeletonRows rows={7} /></Card>
      ) : visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No matching events" body="Try a different action, actor or target." />
        </div>
      ) : (
        <Card padded={false} className="mt-6 overflow-hidden">
          <div className="hidden grid-cols-[10rem_1.2fr_1.4fr_1.6fr] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
            {['Timestamp', 'Actor', 'Action', 'Target'].map((h) => (
              <p key={h} className="ba-label">{h}</p>
            ))}
          </div>
          <ul className="divide-y divide-ink-100">
            {visible.map((l) => (
              <li key={l.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-[10rem_1.2fr_1.4fr_1.6fr] lg:items-center lg:gap-3">
                <div>
                  <p className="text-xs font-semibold text-ink-700">{formatDateTime(l.at)}</p>
                  <p className="text-[11px] text-ink-400">{timeAgo(l.at)}</p>
                </div>
                <p className="ba-num truncate text-xs text-ink-600">{l.actor}</p>
                <Badge className={ACTION_TONE[l.action] ?? 'bg-ink-100 text-ink-600 border-ink-200'}>{l.action}</Badge>
                <p className="truncate text-xs font-medium text-ink-800">{l.target}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
