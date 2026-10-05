import { Leaf, Recycle, TreePine, Droplets } from 'lucide-react';
import { Card, SectionHeading, StatCard } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/Feedback';

const HEADLINE = [
  { label: 'Waste reports resolved', value: '114', delta: '+18 this month', icon: <Recycle className="h-5 w-5" /> },
  { label: 'Waste diverted from landfill', value: '48,230', unit: 'kg', delta: '+6.2%', icon: <Leaf className="h-5 w-5" /> },
  { label: 'CO₂e emissions avoided', value: '96.4', unit: 't', delta: '+4.8%', icon: <Droplets className="h-5 w-5" /> },
  { label: 'Trees-equivalent impact', value: '4,410', delta: 'annualised', icon: <TreePine className="h-5 w-5" /> },
];

const SDGS = [
  {
    goal: 'SDG 11',
    title: 'Sustainable Cities & Communities',
    body: 'Faster response to overflowing bins and illegal dumping keeps public space safe and clean.',
    progress: 72,
  },
  {
    goal: 'SDG 12',
    title: 'Responsible Consumption & Production',
    body: 'Correct sorting at source raises recycling purity and cuts contaminated-load landfilling.',
    progress: 64,
  },
  {
    goal: 'SDG 13',
    title: 'Climate Action',
    body: 'Diversion and route optimisation reduce methane from landfill and fleet emissions.',
    progress: 58,
  },
];

const ZONE_IMPACT = [
  { zone: 'Zone A — Riverside', divertedKg: 18240, recycling: 61, reports: 46 },
  { zone: 'Zone B — Old Town', divertedKg: 17120, recycling: 54, reports: 58 },
  { zone: 'Zone C — Tech Park', divertedKg: 12870, recycling: 68, reports: 37 },
];

export function Impact() {
  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="ba-container py-20">
          <SectionHeading
            eyebrow="Impact"
            title="Measured outcomes, not marketing numbers"
            subtitle="Every figure below is produced by the same analytics pipeline municipalities use — demo data today, live database values tomorrow."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HEADLINE.map((h) => (
              <StatCard key={h.label} label={h.label} value={h.value} unit={h.unit} delta={h.delta} icon={h.icon} />
            ))}
          </div>
        </div>
      </section>

      <section className="ba-container grid gap-12 py-20 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-950">Zone-level diversion</h2>
          <p className="mt-2 text-sm text-ink-500">
            Diverted weight and recycling rate per municipal zone, updated as classifications and collections land.
          </p>
          <div className="mt-8 space-y-6">
            {ZONE_IMPACT.map((z) => (
              <Card key={z.zone} className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold text-ink-900">{z.zone}</p>
                  <p className="ba-num text-lg font-extrabold text-forest-800">{z.divertedKg.toLocaleString()} kg</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={z.recycling} label={`${z.zone} recycling rate`} />
                  <span className="ba-num w-12 text-right text-xs font-bold text-ink-600">{z.recycling}%</span>
                </div>
                <p className="mt-2 text-[11px] text-ink-400">recycling rate · {z.reports} reports filed</p>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-ink-950">UN Sustainable Development Goals</h2>
          <p className="mt-2 text-sm text-ink-500">How BinAlert indicators map to the global sustainability agenda.</p>
          <div className="mt-8 space-y-5">
            {SDGS.map((s) => (
              <div key={s.goal} className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-forest-900 px-2.5 py-1 text-xs font-extrabold text-white">{s.goal}</span>
                  <span className="ba-num text-sm font-extrabold text-emerald2-600">{s.progress}%</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-ink-950">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.body}</p>
                <ProgressBar value={s.progress} className="mt-4" tone="forest" label={`${s.goal} progress`} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
