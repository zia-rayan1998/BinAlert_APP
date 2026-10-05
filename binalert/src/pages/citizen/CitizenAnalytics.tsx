import { useEffect, useState } from 'react';
import { BarChart3, ScanLine } from 'lucide-react';
import { PageHeader, Card, CardHeader } from '../../components/ui/Card';
import { CategoryDonut, WeeklyBars } from '../../components/charts/Charts';
import { EmptyState, SkeletonRows } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { classificationsService } from '../../services/classificationsService';

export function CitizenAnalytics() {
  const { user } = useAuth();
  const [distribution, setDistribution] = useState<{ category: string; value: number; pct: number }[] | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; classifications: number; reports: number }[] | null>(null);
  const [totals, setTotals] = useState<{ count: number; weightKg: number; co2SavedKg: number; divertedKg: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      analyticsService.categoryDistribution(user.id),
      analyticsService.weeklyActivity(),
      classificationsService.totals(user.id),
    ]).then(([d, w, t]) => {
      setDistribution(d);
      setWeekly(w);
      setTotals(t);
    });
  }, [user]);

  return (
    <>
      <PageHeader
        breadcrumb="Personal insights"
        title="My Analytics"
        subtitle="Your sorting behaviour and environmental contribution, visualised."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Waste Classification Chart" subtitle="Distribution by material" icon={<ScanLine className="h-5 w-5" />} />
          {distribution === null ? (
            <SkeletonRows rows={4} />
          ) : distribution.length === 0 ? (
            <EmptyState icon={<ScanLine className="h-6 w-6" />} title="No analytics data yet" body="Classify a few items and your material mix will appear here." />
          ) : (
            <CategoryDonut data={distribution} />
          )}
        </Card>
        <Card>
          <CardHeader title="Weekly Activity" subtitle="Classifications vs reports, last 7 days" icon={<BarChart3 className="h-5 w-5" />} />
          {weekly ? <WeeklyBars data={weekly} /> : <SkeletonRows rows={4} />}
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Privacy-friendly summary" subtitle="What you see here is your own data only" />
        <p className="text-sm leading-relaxed text-ink-500">
          BinAlert follows role-aware analytics privacy: citizens see personal aggregates, while contributor-level and
          city-wide operational totals are reserved for municipal and system administrators. To date you have
          classified <strong className="font-bold text-ink-800">{totals?.count ?? 0} items</strong> totalling{' '}
          <strong className="font-bold text-ink-800">{totals?.weightKg ?? 0} kg</strong>, avoiding an estimated{' '}
          <strong className="font-bold text-ink-800">{totals?.co2SavedKg ?? 0} kg CO₂e</strong>.
        </p>
      </Card>
    </>
  );
}
