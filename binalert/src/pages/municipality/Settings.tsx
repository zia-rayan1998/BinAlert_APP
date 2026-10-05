import { useEffect, useState } from 'react';
import { Bell, Database, KeyRound, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select } from '../../components/ui/Form';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { readLS, writeLS } from '../../services/storage';
import { ZONES } from '../../utils/labels';

interface MuniSettings {
  organisation: string;
  contactEmail: string;
  alertThreshold: number;
  autoAssign: boolean;
  notifyCitizens: boolean;
  notifyWorkers: boolean;
  weeklyDigest: boolean;
  defaultZone: string;
  retentionDays: number;
}

const DEFAULTS: MuniSettings = {
  organisation: 'Riverside Municipal Corporation',
  contactEmail: 'operations@binalert.io',
  alertThreshold: 85,
  autoAssign: true,
  notifyCitizens: true,
  notifyWorkers: true,
  weeklyDigest: false,
  defaultZone: ZONES[0],
  retentionDays: 365,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100 transition-colors hover:bg-ink-100/60">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink-900">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full bg-ink-300 transition-colors peer-checked:bg-emerald2-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald2-500 peer-focus-visible:ring-offset-2" aria-hidden />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" aria-hidden />
      </span>
    </label>
  );
}

export function MunicipalitySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<MuniSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings({ ...DEFAULTS, ...readLS<Partial<MuniSettings>>('muni-settings', {}) });
  }, []);

  function update<K extends keyof MuniSettings>(key: K, value: MuniSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    writeLS('muni-settings', settings);
    setSaving(false);
    toast('success', 'Settings saved', 'Operational preferences updated for your municipality.');
  }

  function reset() {
    setSettings(DEFAULTS);
    writeLS('muni-settings', DEFAULTS);
    toast('info', 'Defaults restored', 'Save to persist the reset configuration.');
  }

  return (
    <>
      <PageHeader
        breadcrumb="Municipal intelligence"
        title="Settings"
        subtitle="Operational thresholds, notifications and data retention for your municipality."
        actions={
          <>
            <Button variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={reset}>Restore defaults</Button>
            <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>Save changes</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Organisation" subtitle="Shown on reports and citizen notifications" icon={<ShieldCheck className="h-5 w-5" />} />
          <div className="space-y-4">
            <Field label="Municipality name" htmlFor="org" required>
              <Input id="org" value={settings.organisation} onChange={(e) => update('organisation', e.target.value)} />
            </Field>
            <Field label="Operations contact email" htmlFor="email" hint="Receives escalations and the weekly digest">
              <Input id="email" type="email" value={settings.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
            </Field>
            <Field label="Default zone" htmlFor="zone">
              <Select id="zone" value={settings.defaultZone} onChange={(e) => update('defaultZone', e.target.value)}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Operational thresholds" subtitle="When BinAlert escalates automatically" icon={<Bell className="h-5 w-5" />} />
          <div className="space-y-4">
            <Field
              label="Bin fill alert threshold"
              htmlFor="threshold"
              hint={`Bins above ${settings.alertThreshold}% fill are flagged for dispatch`}
            >
              <Input
                id="threshold"
                type="number"
                min={50}
                max={100}
                value={settings.alertThreshold}
                onChange={(e) => update('alertThreshold', Math.min(100, Math.max(50, Number(e.target.value))))}
              />
            </Field>
            <Field label="Report retention" htmlFor="retention" hint="Days resolved reports remain queryable">
              <Input
                id="retention"
                type="number"
                min={30}
                max={3650}
                value={settings.retentionDays}
                onChange={(e) => update('retentionDays', Number(e.target.value))}
              />
            </Field>
            <Toggle
              checked={settings.autoAssign}
              onChange={(v) => update('autoAssign', v)}
              label="Auto-assign new reports"
              description="Route incoming reports to the nearest available crew based on zone and open load."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" subtitle="Who gets alerted, and when" />
          <div className="space-y-3">
            <Toggle
              checked={settings.notifyCitizens}
              onChange={(v) => update('notifyCitizens', v)}
              label="Notify citizens"
              description="Send status updates to the reporter when their issue is assigned, progressed or resolved."
            />
            <Toggle
              checked={settings.notifyWorkers}
              onChange={(v) => update('notifyWorkers', v)}
              label="Notify field crews"
              description="Push assignment and priority-change alerts to collection workers."
            />
            <Toggle
              checked={settings.weeklyDigest}
              onChange={(v) => update('weeklyDigest', v)}
              label="Weekly operations digest"
              description={`Email a KPI summary to ${settings.contactEmail} every Monday at 08:00.`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Integrations & data" subtitle="Service endpoints used by this workspace" icon={<Database className="h-5 w-5" />} />
          <ul className="space-y-3 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink-900">Application API</span>
                <span className="ba-num block truncate text-[11px] text-ink-400">VITE_API_URL</span>
              </span>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200">demo mode</Badge>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink-900">AI inference service</span>
                <span className="ba-num block truncate text-[11px] text-ink-400">VITE_AI_API_URL</span>
              </span>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200">demo inference</Badge>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink-900">Session</span>
                <span className="block truncate text-[11px] text-ink-400">{user?.email}</span>
              </span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <KeyRound className="h-3 w-3" /> JWT
              </Badge>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Set these variables in <code className="ba-num rounded bg-ink-100 px-1.5 py-0.5">binalert/.env</code> to point the workspace at a live
            backend. Without them the app runs entirely on the local demo data layer.
          </p>
        </Card>
      </div>
    </>
  );
}
