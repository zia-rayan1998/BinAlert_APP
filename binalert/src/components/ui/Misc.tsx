import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { TimelineEvent } from '../../types';
import { formatDateTime, initials } from '../../utils/format';
import { STATUS_META } from '../../utils/labels';

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-forest-900 shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5.5 w-6" aria-hidden>
          <path d="M9 12h14l-1.4 13a2.4 2.4 0 0 1-2.4 2.2h-6.4A2.4 2.4 0 0 1 10.4 25L9 12z" fill="#10b981" />
          <path d="M12.5 12V9.6a2.2 2.2 0 0 1 2.2-2.2h2.6a2.2 2.2 0 0 1 2.2 2.2V12" stroke="#10b981" strokeWidth="2.2" fill="none" />
          <path d="M12.5 18h2.2l1.1-2.4 1.7 4.6 1.1-2.2h1.9" stroke="#0a1f17" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald2-400 ring-2 ring-white" aria-hidden />
      </span>
      {!compact && (
        <span className={`font-display text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink-950'}`}>
          Bin<span className="text-emerald2-500">Alert</span>
        </span>
      )}
    </span>
  );
}

export function Avatar({ name, hue = 152, size = 'md' }: { name: string; hue?: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white/60 ${sizes[size]}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 38%), hsl(${hue + 40} 60% 30%))` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-150 ${
            active === t.id ? 'bg-white text-ink-950 shadow-card' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active === t.id ? 'bg-forest-50 text-forest-700' : 'bg-ink-200 text-ink-600'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-ink-100 pl-6">
      {events.map((e, i) => {
        const meta = e.status === 'note' || e.status === 'created' ? null : STATUS_META[e.status as keyof typeof STATUS_META];
        const isLast = i === events.length - 1;
        return (
          <li key={`${e.status}-${e.at}-${i}`} className="relative">
            <span
              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                meta ? meta.dot : e.status === 'created' ? 'bg-ink-300' : 'bg-ink-200'
              } ${isLast ? 'animate-pulse' : ''}`}
              aria-hidden
            />
            <p className="text-sm font-semibold text-ink-900">
              {e.status === 'created'
                ? 'Report created'
                : e.status === 'note'
                  ? 'Note added'
                  : `Status → ${meta?.label ?? e.status}`}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              {formatDateTime(e.at)} · {e.by}
            </p>
            {e.note && <p className="mt-1.5 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
}: {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 animate-scale-in overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-lift ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  active = false,
  danger = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {active && <Check className="h-4 w-4 text-emerald2-600" aria-hidden />}
    </button>
  );
}
