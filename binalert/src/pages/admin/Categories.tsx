import { useCallback, useEffect, useState } from 'react';
import { Recycle, Trash2 } from 'lucide-react';
import { Card, PageHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';
import type { WasteCategory } from '../../types';

type CategoryRow = Awaited<ReturnType<typeof adminService.categories>>[number];

export function AdminCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<WasteCategory | ''>('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await adminService.categories());
    } catch {
      setError('Waste categories could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(row: CategoryRow) {
    setBusy(row.category);
    try {
      await adminService.toggleCategory(row.category, !row.active, user?.email ?? 'admin');
      setRows((prev) =>
        prev ? prev.map((r) => (r.category === row.category ? { ...r, active: !r.active, lastUpdated: new Date().toISOString() } : r)) : prev,
      );
      toast('success', `${row.label} ${row.active ? 'disabled' : 'enabled'}`, 'Classification routing updated platform-wide.');
    } catch {
      toast('error', 'Update failed', 'The category could not be changed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="Waste Categories"
        subtitle="The taxonomy the AI classifier routes against, plus bin assignment per stream."
      />

      {error ? (
        <ErrorState body={error} onRetry={load} />
      ) : !rows ? (
        <Card><SkeletonRows rows={8} /></Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="hidden grid-cols-[1.2fr_1.6fr_6rem_9rem_7rem] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
            {['Category', 'Recommended bin', 'Status', 'Last updated', ''].map((h) => (
              <p key={h} className="ba-label">{h}</p>
            ))}
          </div>
          <ul className="divide-y divide-ink-100">
            {rows.map((r) => (
              <li key={r.category} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.2fr_1.6fr_6rem_9rem_7rem] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: r.binColor }} aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-950">{r.label}</p>
                    <p className="ba-num truncate text-[11px] text-ink-400">{r.category}</p>
                  </div>
                </div>
                <p className="truncate text-xs text-ink-600">{r.bin}</p>
                <Badge className={r.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-ink-100 text-ink-500 border-ink-200'}>
                  {r.active ? 'Active' : 'Disabled'}
                </Badge>
                <p className="text-xs text-ink-400">{formatDate(r.lastUpdated)}</p>
                <div className="flex justify-start lg:justify-end">
                  <button
                    onClick={() => toggle(r)}
                    disabled={busy === r.category}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors disabled:opacity-60 ${
                      r.active
                        ? 'border-ink-200 bg-white text-ink-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {r.active ? <Trash2 className="h-3.5 w-3.5" /> : <Recycle className="h-3.5 w-3.5" />}
                    {r.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <p className="text-xs leading-relaxed text-ink-500">
          Disabling a category removes it from the classifier output set and stops new reports being routed to its bin.
          Existing records keep their original classification for audit continuity. Changes are written to the platform audit log.
        </p>
      </Card>
    </>
  );
}
