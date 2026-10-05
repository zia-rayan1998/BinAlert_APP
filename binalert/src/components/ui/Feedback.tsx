import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { formatDateTime, titleCase } from '../../utils/format';
import type { TimelineEvent } from '../../types';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ba-skeleton ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center">
      <div className="mb-4 rounded-xl bg-white p-3 text-ink-400 shadow-card ring-1 ring-ink-100">{icon}</div>
      <h3 className="text-base font-bold text-ink-800">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'We could not load this data. This is usually temporary — please try again.',
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl2 border border-amber-200 bg-amber-50/60 px-6 py-12 text-center"
    >
      <div className="mb-4 rounded-xl bg-white p-3 text-amber-600 shadow-card ring-1 ring-amber-100">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-ink-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'emerald',
  className = '',
  label,
}: {
  value: number;
  tone?: 'emerald' | 'amber' | 'red' | 'sky' | 'forest';
  className?: string;
  label?: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald2-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    sky: 'bg-sky-500',
    forest: 'bg-forest-700',
  };
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-ink-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${tones[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ConfidenceBar({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-24 shrink-0 truncate text-xs font-semibold ${active ? 'text-ink-900' : 'text-ink-500'}`}>
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${active ? 'bg-emerald2-500' : 'bg-ink-300'}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className={`ba-num w-14 shrink-0 text-right text-xs font-bold ${active ? 'text-emerald2-600' : 'text-ink-400'}`}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

const TIMELINE_TONES: Record<string, string> = {
  created: 'bg-sky-500 ring-sky-100',
  submitted: 'bg-sky-500 ring-sky-100',
  assigned: 'bg-amber-500 ring-amber-100',
  'in-progress': 'bg-amber-500 ring-amber-100',
  resolved: 'bg-emerald2-500 ring-emerald2-100',
  rejected: 'bg-red-500 ring-red-100',
  note: 'bg-ink-400 ring-ink-100',
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-ink-400">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-ink-200 pl-6">
      {events.map((event, i) => (
        <li key={`${event.at}-${i}`} className="relative">
          <span
            className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ${TIMELINE_TONES[event.status] ?? 'bg-ink-300 ring-ink-100'}`}
            aria-hidden
          />
          <p className="text-sm font-bold text-ink-900">{titleCase(event.status.replace('-', ' '))}</p>
          <p className="mt-0.5 text-xs text-ink-400">
            {formatDateTime(event.at)} · {event.by}
          </p>
          {event.note && <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
