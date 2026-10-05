import { useEffect, useMemo, useState } from 'react';
import { Award, ClipboardList, ScanLine, Search, Users } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, ProgressBar, SkeletonRows } from '../../components/ui/Feedback';
import { Input } from '../../components/ui/Form';
import { Avatar } from '../../components/ui/Misc';
import { LEVELS } from '../../services/gamificationService';
import { municipalityService } from '../../services/municipalityService';
import { formatNumber } from '../../utils/format';
import { ZONES } from '../../utils/labels';

type Citizen = Awaited<ReturnType<typeof municipalityService.citizens>>[number];

export function MunicipalityCitizens() {
  const [citizens, setCitizens] = useState<Citizen[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('all');

  useEffect(() => {
    municipalityService
      .citizens()
      .then(setCitizens)
      .catch(() => setError('Citizen engagement data could not be loaded.'));
  }, []);

  const visible = useMemo(() => {
    return (citizens ?? []).filter((c) => {
      if (zone !== 'all' && c.zone !== zone) return false;
      if (query.trim() && !c.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [citizens, query, zone]);

  const totals = useMemo(() => {
    const all = citizens ?? [];
    return {
      engaged: all.length,
      reports: all.reduce((s, c) => s + c.reports, 0),
      classifications: all.reduce((s, c) => s + c.classifications, 0),
      points: all.reduce((s, c) => s + c.points, 0),
    };
  }, [citizens]);

  const levelName = (level: number) => LEVELS.find((l) => l.level === level)?.name ?? 'Contributor';
  const levelProgress = (points: number) => {
    const next = LEVELS.find((l) => l.minPoints > points);
    const current = [...LEVELS].reverse().find((l) => points >= l.minPoints) ?? LEVELS[0];
    if (!next) return 100;
    return Math.min(100, ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100);
  };

  return (
    <>
      <PageHeader
        breadcrumb="Municipal intelligence"
        title="Citizen Engagement"
        subtitle="Participation, eco points and reporting behaviour across registered residents."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search citizen…" aria-label="Search citizens" className="!w-56 pl-9" />
          </div>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!citizens} label="Active citizens" value={formatNumber(1240 + totals.engaged)} icon={<Users className="h-5 w-5" />} delta="+38 this month" />
        <StatCard loading={!citizens} label="Reports raised" value={formatNumber(412 + totals.reports)} icon={<ClipboardList className="h-5 w-5" />} delta="+12 this week" />
        <StatCard loading={!citizens} label="Classifications" value={formatNumber(895 + totals.classifications)} icon={<ScanLine className="h-5 w-5" />} delta="AI verified" />
        <StatCard loading={!citizens} label="Eco points issued" value={formatNumber(48200 + totals.points)} icon={<Award className="h-5 w-5" />} delta="gamification" deltaTone="flat" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['all', ...ZONES] as const).map((z) => (
          <button
            key={z}
            onClick={() => setZone(z)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              zone === z ? 'border-forest-800 bg-forest-800 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            {z === 'all' ? 'All zones' : z}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-5"><ErrorState body={error} /></div>
      ) : !citizens ? (
        <Card className="mt-5"><SkeletonRows rows={6} /></Card>
      ) : visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<Users className="h-6 w-6" />} title="No citizens match" body="Try a different name or zone filter." />
        </div>
      ) : (
        <Card padded={false} className="mt-5 overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_1.1fr_5rem_7rem_7rem_1fr] gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3 lg:grid">
            {['Citizen', 'Zone', 'Level', 'Reports', 'Classifications', 'Eco points'].map((h) => (
              <p key={h} className="ba-label">{h}</p>
            ))}
          </div>
          <ul className="divide-y divide-ink-100">
            {visible.map((c, i) => (
              <li key={c.name} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.6fr_1.1fr_5rem_7rem_7rem_1fr] lg:items-center">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} hue={(i * 47) % 360} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-950">{c.name}</p>
                    <p className="truncate text-xs text-ink-400">{levelName(c.level)}</p>
                  </div>
                </div>
                <p className="truncate text-xs text-ink-500">{c.zone}</p>
                <Badge className="bg-forest-50 text-forest-800 border-forest-200">L{c.level}</Badge>
                <p className="ba-num text-sm font-bold text-ink-800">{c.reports}</p>
                <p className="ba-num text-sm font-bold text-ink-800">{c.classifications}</p>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="ba-num font-bold text-ink-900">{formatNumber(c.points)}</span>
                    <span className="text-ink-400">pts</span>
                  </div>
                  <ProgressBar value={levelProgress(c.points)} tone="emerald" label={`${c.name} level progress`} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Engagement drivers" subtitle="What earns citizens eco points" />
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Correct classification', points: 25 },
            { label: 'Overflowing bin report', points: 30 },
            { label: 'Illegal dumping report', points: 40 },
            { label: 'Cleanup campaign', points: 60 },
          ].map((d) => (
            <li key={d.label} className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <p className="text-xs font-semibold text-ink-600">{d.label}</p>
              <p className="ba-num mt-1 text-xl font-extrabold text-emerald2-600">+{d.points}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
