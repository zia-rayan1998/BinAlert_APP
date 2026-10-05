import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={`ba-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="rounded-lg bg-forest-50 p-2 text-forest-700 ring-1 ring-forest-100">{icon}</div>
        )}
        <div>
          <h3 className="text-base font-bold text-ink-950">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaTone = 'up',
  icon,
  hint,
  loading = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  icon?: ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="ba-card p-5">
        <div className="ba-skeleton h-3 w-24" />
        <div className="ba-skeleton mt-4 h-8 w-20" />
        <div className="ba-skeleton mt-3 h-3 w-28" />
      </div>
    );
  }
  return (
    <div className="ba-card group relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <p className="ba-label">{label}</p>
        {icon && (
          <div className="rounded-lg bg-forest-50 p-2 text-forest-700 ring-1 ring-forest-100 transition-transform duration-200 group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>
      <p className="ba-num mt-3 text-3xl font-extrabold text-ink-950">
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-ink-400">{unit}</span>}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              deltaTone === 'up'
                ? 'bg-emerald-50 text-emerald-700'
                : deltaTone === 'down'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-ink-100 text-ink-600'
            }`}
          >
            {deltaTone === 'up' && <ArrowUpRight className="h-3 w-3" aria-hidden />}
            {deltaTone === 'down' && <ArrowDownRight className="h-3 w-3" aria-hidden />}
            {delta}
          </span>
        )}
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald2-600">{breadcrumb}</p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  dark?: boolean;
}) {
  return (
    <div className={`mb-12 max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p
          className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${dark ? 'text-emerald2-300' : 'text-emerald2-600'}`}
        >
          {eyebrow}
        </p>
      )}
      <h2 className={`text-balance text-3xl font-extrabold sm:text-4xl ${dark ? 'text-white' : 'text-ink-950'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-balance text-base leading-relaxed ${dark ? 'text-forest-100/80' : 'text-ink-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
