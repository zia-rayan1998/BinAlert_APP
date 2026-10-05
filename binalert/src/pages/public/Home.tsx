import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  Gift,
  Leaf,
  MapPin,
  Megaphone,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import heroCity from '../../assets/hero-city.jpg';
import community from '../../assets/community.jpg';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeading } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfidenceBar } from '../../components/ui/Feedback';

const IMPACT_STATS = [
  { value: '1,240+', label: 'Waste Reports', sub: 'filed by citizens' },
  { value: '895+', label: 'Waste Items Classified', sub: 'by the AI vision model' },
  { value: '3+', label: 'Municipal Zones', sub: 'under active management' },
  { value: '94%', label: 'Classification Accuracy', sub: 'on validation sets' },
];

const STEPS = [
  { n: '01', title: 'Capture Waste', body: 'Upload or capture a photo of any waste item from your phone in seconds.', icon: Camera },
  { n: '02', title: 'AI Analysis', body: 'A computer-vision model analyses the image and extracts material features.', icon: ScanLine },
  { n: '03', title: 'Waste Classification', body: 'The item is classified into plastic, paper, glass, metal, organic, e-waste, mixed or other.', icon: Sparkles },
  { n: '04', title: 'Recommended Disposal', body: 'BinAlert tells you exactly which bin or drop-off point to use — with an eco tip.', icon: CheckCircle2 },
  { n: '05', title: 'Impact Tracking', body: 'Every classification updates your eco score and the city analytics in real time.', icon: TrendingUp },
];

const CAPABILITIES = [
  {
    icon: ScanLine,
    title: 'AI Waste Classification',
    body: 'Point your camera at any item. Our CNN vision model identifies the material and the correct bin, with confidence scores and alternatives.',
    link: '/classify',
    linkLabel: 'Try classification',
  },
  {
    icon: Megaphone,
    title: 'Smart Waste Reporting',
    body: 'Report overflowing bins, illegal dumping or uncollected waste with GPS pin, photo and priority. Track every report to resolution.',
    link: '/report',
    linkLabel: 'Report an issue',
  },
  {
    icon: BarChart3,
    title: 'Intelligent Analytics',
    body: 'Category distribution, generation trends, collection efficiency and zone comparisons — live dashboards for every stakeholder.',
    link: '/municipality/analytics',
    linkLabel: 'See analytics',
  },
  {
    icon: TrendingUp,
    title: 'Waste Forecasting',
    body: 'Seasonal models predict waste generation 7 and 30 days ahead with confidence bands, so cities pre-position resources.',
    link: '/municipality/forecast',
    linkLabel: 'View forecasts',
  },
  {
    icon: Building2,
    title: 'Municipality Management',
    body: 'Bins, fleets, routes, workers and citizens in one enterprise console with role-based access and full audit trails.',
    link: '/municipality',
    linkLabel: 'Open console',
  },
  {
    icon: Gift,
    title: 'Gamified Citizen Engagement',
    body: 'Eco points, levels, badges and city leaderboards turn responsible disposal into a habit communities enjoy.',
    link: '/eco-points',
    linkLabel: 'Explore rewards',
  },
];

const TESTIMONIALS = [
  {
    quote: 'BinAlert cut our response time to overflowing bins from days to hours. The forecast view is now part of our weekly operations review.',
    name: 'Meera Iyer',
    role: 'Solid Waste Manager, Municipal Corporation',
  },
  {
    quote: 'I finally know which bin everything goes in. My kids compete on the leaderboard — our street has never been cleaner.',
    name: 'Priya Nair',
    role: 'Resident, Zone B — Old Town',
  },
  {
    quote: 'The route optimizer saved our fleet roughly 20% in distance in the first month. Fewer kilometres, fewer missed stops.',
    name: 'S. Prakash',
    role: 'Collection Fleet Supervisor',
  },
];

export function Home() {
  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-forest-950">
        <img
          src={heroCity}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-950/85 to-forest-900/40" aria-hidden />
        <div className="ba-topo absolute inset-0 opacity-40" aria-hidden />

        <div className="ba-container relative grid gap-14 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="animate-fade-up">
            <Badge className="border-emerald2-500/30 bg-emerald2-500/10 text-emerald2-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered waste intelligence platform
            </Badge>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Smarter Waste Management.
              <span className="block bg-gradient-to-r from-emerald2-300 to-emerald2-500 bg-clip-text text-transparent">
                Cleaner Communities.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-forest-100/80">
              BinAlert uses AI-powered waste classification, intelligent reporting and data-driven analytics to make
              waste segregation and collection smarter, faster and more sustainable.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/report">
                <Button size="lg" variant="secondary" icon={<Megaphone className="h-5 w-5" />}>
                  Report Waste
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-forest-700 bg-transparent text-white hover:border-forest-500 hover:bg-forest-900"
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  Explore BinAlert
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-forest-100/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald2-400" /> Role-based municipal access</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-emerald2-400" /> Live city map</span>
              <span className="inline-flex items-center gap-1.5"><Leaf className="h-4 w-4 text-emerald2-400" /> SDG 11 · 12 · 13 aligned</span>
            </div>
          </div>

          {/* Product mock */}
          <div className="relative animate-fade-up delay-150">
            <div className="relative mx-auto max-w-md rounded-2xl border border-forest-800 bg-forest-900/70 p-5 shadow-lift backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald2-300">AI Classification Result</p>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald2-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald2-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald2-400" /> LIVE
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-forest-950/60 p-4 ring-1 ring-forest-800">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 ring-1 ring-blue-400/30">
                  <ScanLine className="h-6 w-6 text-blue-300" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">PET Water Bottle</p>
                  <p className="text-xs text-forest-100/60">Category: Recyclable Plastic</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="ba-num text-2xl font-extrabold text-emerald2-400">94.7%</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-100/50">confidence</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <ConfidenceBar label="Plastic" value={94.7} active />
                <ConfidenceBar label="Glass" value={2.8} />
                <ConfidenceBar label="Other" value={2.5} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald2-500/10 px-4 py-3 ring-1 ring-emerald2-500/25">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald2-300">Recommended bin</p>
                  <p className="text-sm font-bold text-white">Blue — Recyclable</p>
                </div>
                <span className="h-8 w-8 rounded-lg bg-blue-500 shadow-glow" aria-hidden />
              </div>
            </div>

            <div className="absolute -left-6 top-8 hidden animate-fade-up delay-300 rounded-xl border border-forest-800 bg-forest-900/90 px-4 py-3 shadow-lift backdrop-blur sm:block">
              <p className="ba-num text-xl font-extrabold text-white">+25</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald2-300">eco points</p>
            </div>
            <div className="absolute -right-4 bottom-10 hidden animate-fade-up delay-300 rounded-xl border border-forest-800 bg-forest-900/90 px-4 py-3 shadow-lift backdrop-blur sm:block">
              <p className="ba-num text-xl font-extrabold text-white">0.9 kg</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald2-300">CO₂e avoided</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ LIVE IMPACT ============ */}
      <section className="border-b border-ink-100 bg-white">
        <div className="ba-container py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE IMPACT
              </p>
              <h2 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">The city, in real time</h2>
            </div>
            <p className="text-xs font-medium text-ink-400">Demo data — wired to swap in live database values.</p>
          </div>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {IMPACT_STATS.map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl2 border border-ink-100 bg-canvas p-6 transition-shadow hover:shadow-card">
                <dt className="ba-label">{s.label}</dt>
                <dd className="ba-num mt-2 text-4xl font-extrabold text-forest-800">{s.value}</dd>
                <p className="mt-1 text-xs text-ink-400">{s.sub}</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald2-400 to-forest-600" aria-hidden />
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="ba-container py-20 lg:py-24">
        <SectionHeading
          eyebrow="How BinAlert Works"
          title="From photo to impact in five steps"
          subtitle="A single flow connects citizens, collection crews and city planners around one source of truth."
        />
        <ol className="grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative">
              <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-800 text-white shadow-sm">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="ba-num text-3xl font-extrabold text-ink-100">{step.n}</span>
                </div>
                <h3 className="mt-4 text-base font-bold text-ink-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.body}</p>
              </Card>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-ink-300 lg:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ============ CAPABILITIES ============ */}
      <section className="border-y border-ink-100 bg-white py-20 lg:py-24">
        <div className="ba-container">
          <SectionHeading
            eyebrow="One platform, every stakeholder"
            title="Everything a smart waste city needs"
            subtitle="Six connected capabilities, one design system, zero spreadsheets."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <Card key={c.title} className="group flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                <span className="inline-flex w-fit rounded-xl bg-forest-50 p-3 text-forest-700 ring-1 ring-forest-100 transition-colors group-hover:bg-forest-800 group-hover:text-white">
                  <c.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-950">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{c.body}</p>
                <Link to={c.link} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald2-600 transition-colors hover:text-forest-700">
                  {c.linkLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ENVIRONMENTAL IMPACT ============ */}
      <section className="ba-container grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="relative overflow-hidden rounded-2xl shadow-lift">
          <img src={community} alt="Community volunteers sorting recyclables at a neighborhood cleanup" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-950/90 to-transparent p-6">
            <p className="text-sm font-bold text-white">Community cleanup, Zone A — 214 kg diverted in one morning</p>
          </div>
        </div>
        <div>
          <SectionHeading
            align="left"
            eyebrow="Environmental Impact"
            title="Every sorted item moves the city's curve"
            subtitle="BinAlert quantifies diversion, CO₂e avoidance and landfill reduction so sustainability stops being a slogan and becomes a metric."
          />
          <ul className="space-y-4">
            {[
              ['Diversion tracking', 'Recyclable and organic weight is tracked per household, zone and month.'],
              ['CO₂e accounting', 'Material-specific emission factors convert sorted weight into avoided emissions.'],
              ['Landfill reduction', 'Municipal dashboards show landfill tonnage trending down as participation rises.'],
              ['SDG alignment', 'Reporting maps to UN SDG 11, 12 and 13 indicators for city sustainability reports.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/impact" className="mt-8 inline-block">
            <Button variant="outline" iconRight={<ArrowRight className="h-4 w-4" />}>See full impact report</Button>
          </Link>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="border-y border-ink-100 bg-forest-950 py-20 lg:py-24">
        <div className="ba-container">
          <SectionHeading
            dark
            eyebrow="Community & Partners"
            title="Trusted on the street and in the council chamber"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex h-full flex-col rounded-xl2 border border-forest-800 bg-forest-900/60 p-6 backdrop-blur">
                <Trophy className="h-5 w-5 text-emerald2-400" aria-hidden />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-forest-100/85">“{t.quote}”</blockquote>
                <figcaption className="mt-5 border-t border-forest-800 pt-4">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-forest-100/50">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="ba-container py-20 lg:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 to-forest-950 px-8 py-14 text-center shadow-lift sm:px-14">
          <div className="ba-topo absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <h2 className="text-balance text-3xl font-extrabold text-white sm:text-4xl">
              Ready to make your city's waste intelligent?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-forest-100/75">
              Create a free citizen account, or bring BinAlert to your municipality and unlock the full operations
              console, analytics and forecasting suite.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" variant="secondary">Create free account</Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-forest-700 bg-transparent text-white hover:border-forest-500 hover:bg-forest-900">
                  Talk to our team
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
