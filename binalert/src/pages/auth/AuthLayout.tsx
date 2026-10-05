import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, ScanLine, TrendingUp } from 'lucide-react';
import { Logo } from '../../components/ui/Misc';
import heroCity from '../../assets/hero-city.jpg';

const HIGHLIGHTS = [
  { icon: ScanLine, text: 'AI classification with confidence scores' },
  { icon: MapPin, text: 'Geo-tagged reports tracked to resolution' },
  { icon: TrendingUp, text: 'City analytics and 30-day forecasting' },
];

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-forest-950 lg:block">
        <img src={heroCity} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-950/80 to-forest-900/30" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label="BinAlert home">
            <Logo dark />
          </Link>
          <div>
            <h2 className="max-w-md text-balance text-3xl font-extrabold leading-tight text-white">
              Smarter waste management starts with one photo.
            </h2>
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((h) => (
                <li key={h.text} className="flex items-center gap-3 text-sm font-semibold text-forest-100/85">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald2-500/15 text-emerald2-300 ring-1 ring-emerald2-500/30">
                    <h.icon className="h-4.5 w-5" aria-hidden />
                  </span>
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-forest-100/40">© 2026 BinAlert Technologies · Demo environment</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-canvas">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="BinAlert home">
            <Logo />
          </Link>
          <Link to="/" className="text-sm font-semibold text-ink-500 transition-colors hover:text-ink-900">
            ← Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md animate-fade-up">
            <div className="mb-8 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">{title}</h1>
                <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
