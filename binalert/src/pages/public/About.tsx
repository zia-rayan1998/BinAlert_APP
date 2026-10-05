import { Link } from 'react-router-dom';
import { Brain, Globe2, LineChart, MapPinned, ShieldCheck, Target } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, SectionHeading } from '../../components/ui/Card';

const PILLARS = [
  {
    icon: Brain,
    title: 'AI-powered approach',
    body: 'A CNN computer-vision pipeline (ResNet-50 / EfficientNet class architectures, trained on TrashNet and TACO-style datasets) turns a phone photo into a confident, explainable sorting decision.',
  },
  {
    icon: LineChart,
    title: 'Macro intelligence',
    body: 'Every micro decision rolls up into city-scale analytics: generation trends, recycling rates, collection efficiency and 7/30-day forecasts with confidence bands.',
  },
  {
    icon: MapPinned,
    title: 'Operations on a map',
    body: 'Bins, reports, vehicles, routes and recycling centres live on one interactive map with status-coloured markers — the shared picture every team works from.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade trust',
    body: 'JWT authentication, role-based access for citizens, workers, municipal and system admins, validation on every input and audit logs on every action.',
  },
];

const TECH = [
  { group: 'Frontend', items: ['React + TypeScript', 'Vite', 'Tailwind CSS', 'Recharts', 'Leaflet maps'] },
  { group: 'Backend', items: ['Node.js + Express', 'REST API', 'JWT auth', 'Role-based access', 'Audit logging'] },
  { group: 'Data', items: ['PostgreSQL', 'Prisma ORM', 'Time-series analytics', 'Forecast storage'] },
  { group: 'AI / ML', items: ['Python + FastAPI', 'PyTorch CNN classifier', 'Prophet / LSTM forecasting', 'Grad-CAM explainability'] },
];

export function About() {
  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="ba-container py-20 lg:py-24">
          <SectionHeading
            eyebrow="About BinAlert"
            title="Waste is a data problem. We solve it at both ends."
            subtitle="Most waste is mis-sorted at the bin and mis-managed at the city. BinAlert connects the two: micro-level AI sorting guidance for every citizen, macro-level intelligence for every municipality."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-l-4 border-l-red-400">
              <p className="ba-label text-red-500">The problem · micro</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Citizens want to recycle correctly but don't know which bin an item belongs to. Contamination turns
                recyclable loads into landfill loads — silently, every single day.
              </p>
            </Card>
            <Card className="border-l-4 border-l-amber-400">
              <p className="ba-label text-amber-600">The problem · macro</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Municipalities plan collections on yesterday's assumptions: fixed routes, fixed schedules, no
                visibility into generation patterns — until a bin overflows and a resident complains.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="ba-container py-20 lg:py-24">
        <SectionHeading
          eyebrow="Our mission"
          title="Make the right bin the obvious bin"
          subtitle="BinAlert exists to remove guesswork from waste — for the person holding it and for the city collecting it."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <Card key={p.title} className="transition-shadow hover:shadow-lift">
              <CardHeader icon={<p.icon className="h-5 w-5" />} title={p.title} />
              <p className="-mt-2 text-sm leading-relaxed text-ink-500">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-white py-20 lg:py-24">
        <div className="ba-container">
          <SectionHeading eyebrow="Technology" title="Built like production software, not a prototype" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TECH.map((t) => (
              <div key={t.group} className="rounded-xl2 border border-ink-100 bg-canvas p-6">
                <p className="ba-label">{t.group}</p>
                <ul className="mt-4 space-y-2.5">
                  {t.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-medium text-ink-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald2-500" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ba-container py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="rounded-2xl bg-forest-950 p-8 text-white shadow-lift">
            <Globe2 className="h-8 w-8 text-emerald2-400" aria-hidden />
            <h3 className="mt-4 text-xl font-extrabold">SDG aligned</h3>
            <p className="mt-3 text-sm leading-relaxed text-forest-100/75">
              BinAlert's indicators map to UN Sustainable Development Goals 11 (Sustainable Cities), 12 (Responsible
              Consumption) and 13 (Climate Action).
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
            <Target className="h-8 w-8 text-emerald2-600" aria-hidden />
            <h3 className="mt-4 text-xl font-extrabold text-ink-950">Future vision</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Sensor-fed bin fill levels, autonomous route re-planning, and a public waste data API so researchers and
              startups can build on city waste intelligence.
            </p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-forest-300 bg-forest-50/60 p-8 text-center">
            <h3 className="text-xl font-extrabold text-forest-900">Join the mission</h3>
            <p className="mt-2 text-sm text-forest-800/70">Start classifying and reporting today.</p>
            <Link to="/signup" className="mt-5">
              <Button variant="primary" className="w-full">Create free account</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
