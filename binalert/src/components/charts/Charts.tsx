import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastPoint } from '../../types';

export const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#64748b', '#ef4444', '#14b8a6', '#ec4899'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #ececec',
  boxShadow: '0 12px 32px -8px rgba(18,24,21,0.16)',
  fontSize: 12,
  padding: '8px 12px',
} as const;

export function CategoryDonut({ data }: { data: { category: string; value: number; pct?: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="category" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} items`, n]} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-semibold capitalize text-ink-600">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WeeklyBars({ data }: { data: { day: string; classifications: number; reports: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(18,48,36,0.04)' }} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-semibold capitalize text-ink-600">{v}</span>} />
        <Bar dataKey="classifications" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="reports" fill="#123024" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyStackedArea({ data }: { data: Record<string, string | number>[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gPlastic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gOrganic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} width={34} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-semibold capitalize text-ink-600">{v}</span>} />
        <Area type="monotone" dataKey="plastic" stackId="1" stroke="#10b981" fill="url(#gPlastic)" strokeWidth={2} />
        <Area type="monotone" dataKey="organic" stackId="1" stroke="#f59e0b" fill="url(#gOrganic)" strokeWidth={2} />
        <Area type="monotone" dataKey="paper" stackId="1" stroke="#0ea5e9" fill="url(#gPaper)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123024" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#123024" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#66776d' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} width={44} domain={['dataMin - 80', 'dataMax + 80']} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} kg/day`, n]} />
        <Legend iconType="plainline" formatter={(v) => <span className="text-xs font-semibold text-ink-600">{v}</span>} />
        <Area dataKey="bandHigh" stroke="none" fill="url(#gBand)" name="Confidence band" legendType="none" tooltipType="none" />
        <Area dataKey="bandLow" stroke="none" fill="#f7f8f6" name="bandLow" legendType="none" tooltipType="none" />
        <Area type="monotone" dataKey="actual" name="Historical" stroke="#123024" strokeWidth={2.5} fill="url(#gActual)" dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 2.5, fill: '#10b981' }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data, dataKey, color = '#10b981', unit = '' }: { data: Record<string, string | number>[]; dataKey: string; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
        <XAxis dataKey={Object.keys(data[0] ?? { label: '' })[0]} tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} width={34} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}${unit}`, dataKey]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ZoneBars({ data }: { data: { zone: string; reports: number; resolved: number; recycling: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
        <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#66776d' }} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(18,48,36,0.04)' }} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-semibold capitalize text-ink-600">{v}</span>} />
        <Bar dataKey="reports" fill="#64748b" radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Bar dataKey="recycling" fill="#123024" radius={[6, 6, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
