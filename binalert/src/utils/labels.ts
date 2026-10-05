import type {
  BinStatus,
  Priority,
  ReportStatus,
  ReportType,
  Role,
  WasteCategory,
} from '../types';

export const CATEGORY_META: Record<
  WasteCategory,
  { label: string; bin: string; binColor: string; chip: string; tip: string }
> = {
  plastic: {
    label: 'Plastic',
    bin: 'Blue — Recyclable',
    binColor: '#2563eb',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    tip: 'Rinse the container and remove the cap before recycling.',
  },
  paper: {
    label: 'Paper',
    bin: 'Blue — Recyclable',
    binColor: '#0ea5e9',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    tip: 'Keep paper dry and flatten boxes to save collection space.',
  },
  glass: {
    label: 'Glass',
    bin: 'Green — Glass Bank',
    binColor: '#059669',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tip: 'Remove lids and rinse; do not mix broken glass with recyclables.',
  },
  metal: {
    label: 'Metal',
    bin: 'Blue — Recyclable',
    binColor: '#64748b',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    tip: 'Empty cans completely; scrunching foil into a ball improves sorting.',
  },
  organic: {
    label: 'Organic',
    bin: 'Brown — Compost',
    binColor: '#92400e',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    tip: 'Compost food scraps separately to cut methane from landfill.',
  },
  'e-waste': {
    label: 'E-Waste',
    bin: 'Red — Hazardous / E-Waste Drop-off',
    binColor: '#dc2626',
    chip: 'bg-red-50 text-red-700 border-red-200',
    tip: 'Never bin batteries or electronics — use a certified e-waste point.',
  },
  mixed: {
    label: 'Mixed Waste',
    bin: 'Grey — General Waste',
    binColor: '#475569',
    chip: 'bg-slate-50 text-slate-600 border-slate-200',
    tip: 'Separate recyclables from general waste whenever possible.',
  },
  other: {
    label: 'Other',
    bin: 'Grey — General Waste',
    binColor: '#6b7280',
    chip: 'bg-ink-50 text-ink-600 border-ink-200',
    tip: 'When unsure, check the BinAlert guide before disposing.',
  },
};

export const REPORT_TYPE_META: Record<ReportType, { label: string; icon: string }> = {
  'overflowing-bin': { label: 'Overflowing Bin', icon: 'trash' },
  'illegal-dumping': { label: 'Illegal Dumping', icon: 'alert' },
  'uncollected-waste': { label: 'Uncollected Waste', icon: 'clock' },
  'roadside-waste': { label: 'Roadside Waste', icon: 'road' },
  'mixed-waste': { label: 'Mixed Waste', icon: 'layers' },
  'hazardous-waste': { label: 'Hazardous Waste', icon: 'hazard' },
  other: { label: 'Other', icon: 'dot' },
};

export const STATUS_META: Record<
  ReportStatus,
  { label: string; chip: string; dot: string }
> = {
  submitted: {
    label: 'Submitted',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  assigned: {
    label: 'Assigned',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  'in-progress': {
    label: 'In Progress',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export const PRIORITY_META: Record<Priority, { label: string; chip: string }> = {
  low: { label: 'Low', chip: 'bg-ink-50 text-ink-600 border-ink-200' },
  medium: { label: 'Medium', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  high: { label: 'High', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', chip: 'bg-red-50 text-red-700 border-red-200' },
};

export const BIN_STATUS_META: Record<
  BinStatus,
  { label: string; color: string; chip: string }
> = {
  normal: { label: 'Normal', color: '#10b981', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  attention: { label: 'Needs Attention', color: '#eab308', chip: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  high: { label: 'High Priority', color: '#f97316', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Overflowing', color: '#ef4444', chip: 'bg-red-50 text-red-700 border-red-200' },
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  citizen: { label: 'Citizen', description: 'Report waste, classify items, earn eco points' },
  worker: { label: 'Collection Worker', description: 'Field collections and report resolution' },
  municipality: { label: 'Municipality Admin', description: 'City operations, analytics and forecasting' },
  admin: { label: 'System Admin', description: 'Platform-wide administration and audit' },
};

export const ZONES = ['Zone A — Riverside', 'Zone B — Old Town', 'Zone C — Tech Park'];
