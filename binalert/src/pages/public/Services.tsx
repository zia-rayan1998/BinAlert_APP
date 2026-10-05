import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Gift,
  MapPinned,
  Megaphone,
  Route,
  ScanLine,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Card, SectionHeading } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const SERVICES = [
  {
    icon: ScanLine,
    title: 'AI Waste Classification',
    body: 'Computer-vision sorting guidance with confidence scores, alternative predictions, bin colour coding and eco tips.',
    points: ['8 material categories', 'Confidence + alternatives', 'Explainable results'],
    link: '/classify',
  },
  {
    icon: Megaphone,
    title: 'Waste Reporting',
    body: 'Geo-tagged reports for overflowing bins, illegal dumping, uncollected and hazardous waste — with full status timelines.',
    points: ['GPS pin + photo', 'Priority levels', 'Resolution evidence'],
    link: '/report',
  },
  {
    icon: Truck,
    title: 'Smart Collection',
    body: 'Schedules, vehicles, workers and stop-level status for every collection run across the city.',
    points: ['Live run status', 'Missed-stop detection', 'Fleet overview'],
    link: '/municipality/collections',
  },
  {
    icon: Route,
    title: 'Route Optimization',
    body: 'Suggested optimized routes with estimated distance, time, fuel savings and stop counts per zone.',
    points: ['Distance & time estimates', 'Fuel saving projection', 'Priority stop ordering'],
    link: '/municipality/routes',
  },
  {
    icon: BarChart3,
    title: 'Waste Analytics',
    body: 'Category distribution, generation over time, recycling vs landfill share, zone and day comparisons.',
    points: ['10+ chart views', 'Zone comparisons', 'Role-aware privacy'],
    link: '/municipality/analytics',
  },
  {
    icon: TrendingUp,
    title: 'Waste Forecasting',
    body: '7-day and 30-day generation forecasts with confidence bands, seasonal trends and zone-level predictions.',
    points: ['Historical vs predicted', 'Confidence bands', 'Seasonal insight'],
    link: '/municipality/forecast',
  },
  {
    icon: MapPinned,
    title: 'Interactive City Map',
    body: 'Reports, bins, vehicles, zones, routes and recycling centres on one live map with status-coloured markers.',
    points: ['Status colour coding', 'Rich marker popups', 'Layer filters'],
    link: '/map',
  },
  {
    icon: Building2,
    title: 'Municipality Dashboard',
    body: 'Enterprise console for reports, bins, collections, citizens, recycling and settings with audit trails.',
    points: ['Role-based access', 'Assignment workflow', 'Audit logging'],
    link: '/municipality',
  },
  {
    icon: Gift,
    title: 'Citizen Engagement',
    body: 'Eco points, levels, badges and leaderboards that make sustainable behaviour visible and rewarding.',
    points: ['Points & levels', 'Badge achievements', 'City leaderboard'],
    link: '/eco-points',
  },
];

export function Services() {
  return (
    <section className="ba-container py-20 lg:py-24">
      <SectionHeading
        eyebrow="Services"
        title="Nine services, one intelligent waste ecosystem"
        subtitle="Each service works standalone and compounds when combined — citizen actions feed municipal intelligence."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Card key={s.title} className="group flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
            <span className="inline-flex w-fit rounded-xl bg-forest-800 p-3 text-white shadow-sm">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink-950">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
            <ul className="mt-4 space-y-1.5">
              {s.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                  <span className="h-1 w-1 rounded-full bg-emerald2-500" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <Link to={s.link} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-emerald2-600 hover:text-forest-700">
              Open service
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>
        ))}
      </div>
      <div className="mt-14 rounded-2xl border border-forest-200 bg-forest-50/70 p-8 text-center">
        <h3 className="text-xl font-extrabold text-forest-900">Not sure where to start?</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-forest-800/70">
          Report a waste issue in under a minute — no account required to see how the flow works, or sign up to track
          it to resolution and earn eco points.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/report"><Button variant="secondary">Report Waste</Button></Link>
          <Link to="/signup"><Button variant="outline">Sign Up</Button></Link>
        </div>
      </div>
    </section>
  );
}
