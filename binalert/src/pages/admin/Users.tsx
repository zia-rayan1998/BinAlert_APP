import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { Card, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { Input, Select } from '../../components/ui/Form';
import { Avatar } from '../../components/ui/Misc';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';
import { ROLE_META } from '../../utils/labels';
import type { Role, User } from '../../types';

const ROLE_CHIP: Record<Role, string> = {
  citizen: 'bg-sky-50 text-sky-700 border-sky-200',
  worker: 'bg-amber-50 text-amber-800 border-amber-200',
  municipality: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-forest-50 text-forest-800 border-forest-200',
};

export function AdminUsers() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [pending, setPending] = useState<{ user: User; role: Role } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setUsers(await adminService.users());
    } catch {
      setError('User directory could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    return (users ?? []).filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, query, role]);

  const counts = useMemo(() => {
    const base = { all: users?.length ?? 0 } as Record<string, number>;
    (Object.keys(ROLE_META) as Role[]).forEach((r) => {
      base[r] = users?.filter((u) => u.role === r).length ?? 0;
    });
    return base;
  }, [users]);

  async function applyRole() {
    if (!pending) return;
    setBusy(true);
    try {
      const updated = await adminService.setUserRole(pending.user.id, pending.role, me?.email ?? 'admin');
      setUsers((prev) => (prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev));
      toast('success', 'Role updated', `${updated.name} is now ${ROLE_META[updated.role].label}.`);
    } catch {
      toast('error', 'Could not update role', 'Please try again.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="Users & Roles"
        subtitle="Manage accounts and role-based access across every tenant."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" aria-label="Search users" className="!w-64 pl-9" />
          </div>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!users} label="Total accounts" value={counts.all} icon={<Users className="h-5 w-5" />} hint="all tenants" />
        <StatCard loading={!users} label="Citizens" value={counts.citizen ?? 0} icon={<ShieldCheck className="h-5 w-5" />} deltaTone="flat" delta="public app" />
        <StatCard loading={!users} label="Workers & municipality" value={(counts.worker ?? 0) + (counts.municipality ?? 0)} icon={<UserCog className="h-5 w-5" />} deltaTone="flat" delta="field + ops" />
        <StatCard loading={!users} label="System admins" value={counts.admin ?? 0} icon={<ShieldCheck className="h-5 w-5" />} deltaTone="flat" delta="elevated access" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['all', ...(Object.keys(ROLE_META) as Role[])] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              role === r ? 'border-forest-800 bg-forest-800 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            {r === 'all' ? 'All roles' : ROLE_META[r].label}
            <span className="ml-1.5 opacity-70">{counts[r] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-5"><ErrorState body={error} onRetry={load} /></div>
      ) : !users ? (
        <Card className="mt-5"><SkeletonRows rows={6} /></Card>
      ) : visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<Users className="h-6 w-6" />} title="No accounts match" body="Adjust the search or role filter." />
        </div>
      ) : (
        <Card padded={false} className="mt-5 overflow-hidden">
          <div className="hidden grid-cols-[1.8fr_1.4fr_1fr_8rem_9rem] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
            {['Account', 'Email', 'Role', 'Eco score', 'Joined'].map((h) => (
              <p key={h} className="ba-label">{h}</p>
            ))}
          </div>
          <ul className="divide-y divide-ink-100">
            {visible.map((u) => (
              <li key={u.id} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.8fr_1.4fr_1fr_8rem_9rem] lg:items-center">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} hue={u.avatarHue} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-950">
                      {u.name}
                      {u.id === me?.id && <span className="ml-2 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">YOU</span>}
                    </p>
                    <p className="truncate text-xs text-ink-400">{u.location}</p>
                  </div>
                </div>
                <p className="truncate text-xs text-ink-500">{u.email}</p>
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_CHIP[u.role]}>{ROLE_META[u.role].label}</Badge>
                </div>
                <p className="ba-num text-sm font-bold text-ink-800">{u.ecoScore}</p>
                <div className="flex items-center justify-between gap-2 lg:block">
                  <p className="text-xs text-ink-400">{formatDate(u.joinedAt)}</p>
                  <div className="mt-2 flex gap-2 lg:mt-2">
                    <Select
                      value={u.role}
                      aria-label={`Role for ${u.name}`}
                      disabled={u.id === me?.id}
                      className="!h-8 !w-40 !text-xs"
                      onChange={(e) => setPending({ user: u, role: e.target.value as Role })}
                    >
                      {(Object.keys(ROLE_META) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={applyRole}
        loading={busy}
        title="Change user role?"
        body={`${pending?.user.name ?? ''} will become ${pending ? ROLE_META[pending.role].label : ''}. ${pending ? ROLE_META[pending.role].description : ''} This is written to the audit log.`}
        confirmLabel="Update role"
      />
    </>
  );
}
