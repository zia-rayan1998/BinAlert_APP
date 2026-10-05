import { useEffect, useState } from 'react';
import { Mail, MapPin, Pencil, Save } from 'lucide-react';
import { PageHeader, Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { Avatar } from '../../components/ui/Misc';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { classificationsService } from '../../services/classificationsService';
import { reportsService } from '../../services/reportsService';
import { gamificationService, levelInfo } from '../../services/gamificationService';
import { formatDate } from '../../utils/format';
import { ROLE_META } from '../../utils/labels';
import type { BadgeDef } from '../../types';

export function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ reports: number; classifications: number } | null>(null);
  const [badges, setBadges] = useState<BadgeDef[]>([]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      reportsService.list({ userId: user.id }),
      classificationsService.list(user.id),
      gamificationService.badges(),
    ]).then(([r, c, b]) => {
      setStats({ reports: r.length, classifications: c.length });
      setBadges(b);
    });
  }, [user]);

  if (!user) return null;
  const level = levelInfo(user.points);

  async function save() {
    if (!user) return;
    setSaving(true);
    const updated = await authService.updateUser(user.id, { name, location });
    setUser(updated);
    setSaving(false);
    setEditing(false);
    toast('success', 'Profile updated', 'Your details have been saved.');
  }

  return (
    <>
      <PageHeader breadcrumb="Account" title="Profile" subtitle="Your identity, contribution and settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user.name} hue={user.avatarHue} size="lg" />
            <h2 className="mt-4 text-xl font-extrabold text-ink-950">{user.name}</h2>
            <Badge className="mt-2 border-forest-200 bg-forest-50 text-forest-800">{ROLE_META[user.role].label}</Badge>
            <div className="mt-4 w-full space-y-2 text-left">
              <p className="flex items-center gap-2 text-sm text-ink-600"><Mail className="h-4 w-4 text-ink-400" />{user.email}</p>
              <p className="flex items-center gap-2 text-sm text-ink-600"><MapPin className="h-4 w-4 text-ink-400" />{user.location}</p>
            </div>
            <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                <p className="ba-label">Level</p>
                <p className="ba-num mt-1 text-xl font-extrabold text-forest-800">{user.level}</p>
                <p className="text-[11px] font-semibold text-ink-500">{level.current.name}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                <p className="ba-label">Eco Score</p>
                <p className="ba-num mt-1 text-xl font-extrabold text-emerald2-600">{user.ecoScore}</p>
                <p className="text-[11px] font-semibold text-ink-500">out of 100</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-400">Member since {formatDate(user.joinedAt)}</p>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <StatCard label="Items classified" value={stats?.classifications ?? '—'} hint="verified by AI" />
            <StatCard label="Reports submitted" value={stats?.reports ?? '—'} hint="tracked to resolution" />
            <StatCard label="Eco points balance" value={user.points.toLocaleString()} delta={`Level ${user.level}`} deltaTone="flat" />
            <StatCard label="Badges earned" value={user.badges.length} hint={`of ${badges.length || 5} available`} />
          </div>

          <Card>
            <CardHeader
              title="User Information"
              subtitle="Keep your contact details current so crews can reach you."
              action={
                editing ? (
                  <Button size="sm" loading={saving} icon={<Save className="h-3.5 w-3.5" />} onClick={save}>Save</Button>
                ) : (
                  <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>Edit</Button>
                )
              }
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" htmlFor="p-name">
                <Input id="p-name" value={name} disabled={!editing} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Location / zone" htmlFor="p-loc">
                <Input id="p-loc" value={location} disabled={!editing} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="p-email">
                <Input id="p-email" value={user.email} disabled />
              </Field>
              <Field label="Role" htmlFor="p-role">
                <Input id="p-role" value={ROLE_META[user.role].label} disabled />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Earned badges" subtitle="Displayed on your public contributor card" />
            <div className="flex flex-wrap gap-2">
              {user.badges.length === 0 ? (
                <p className="text-sm text-ink-400">No badges yet — classify your first item to earn “First Report”.</p>
              ) : (
                badges.filter((b) => user.badges.includes(b.id)).map((b) => (
                  <Badge key={b.id} className="border-emerald-200 bg-emerald-50 text-emerald-800">{b.name}</Badge>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
