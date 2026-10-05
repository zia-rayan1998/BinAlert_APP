import type { ReactNode } from 'react';
import type { BinStatus, Priority, ReportStatus, WasteCategory } from '../../types';
import { BIN_STATUS_META, CATEGORY_META, PRIORITY_META, STATUS_META } from '../../utils/labels';

export function Badge({
  children,
  className = '',
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={meta.chip}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return <Badge className={meta.chip}>{meta.label} priority</Badge>;
}

export function BinStatusPill({ status }: { status: BinStatus }) {
  const meta = BIN_STATUS_META[status];
  return (
    <Badge className={meta.chip}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function CategoryChip({ category }: { category: WasteCategory }) {
  const meta = CATEGORY_META[category];
  return <Badge className={meta.chip}>{meta.label}</Badge>;
}
