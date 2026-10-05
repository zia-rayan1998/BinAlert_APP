import { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Gauge, Info, Timer } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, ProgressBar, Skeleton } from '../../components/ui/Feedback';
import { adminService } from '../../services/adminService';
import { aiClassificationService } from '../../services/aiClassificationService';
import { formatNumber } from '../../utils/format';

type AiStats = Awaited<ReturnType<typeof adminService.aiStats>>;

export function AdminAiModel() {
  const [stats, setStats] = useState<AiStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .aiStats()
      .then(setStats)
      .catch(() => setError('AI model statistics could not be loaded.'));
  }, []);

  const live = aiClassificationService.mode === 'api';

  return (
    <>
      <PageHeader
        breadcrumb="System administration"
        title="AI Model Statistics"
        subtitle="Classification accuracy, latency and per-category performance for the inference service."
        actions={
          <Badge className={live ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>
            {live ? 'Live inference' : 'Demo inference'}
          </Badge>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <p className="text-xs font-medium leading-relaxed text-amber-900">
          {stats?.note ?? 'Loading model metadata…'}
        </p>
      </div>

      {error ? (
        <ErrorState body={error} />
      ) : !stats ? (
        <Card><Skeleton className="h-64 w-full" /></Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Overall accuracy" value={stats.accuracy} unit="%" icon={<Gauge className="h-5 w-5" />} delta="held-out test set" deltaTone="flat" />
            <StatCard label="Avg latency" value={stats.avgLatencyMs} unit="ms" icon={<Timer className="h-5 w-5" />} delta="p50 inference" deltaTone="flat" />
            <StatCard label="Requests (24h)" value={formatNumber(stats.requests24h)} icon={<Activity className="h-5 w-5" />} delta={`${stats.failedRequests24h} failed`} deltaTone={stats.failedRequests24h > 10 ? 'down' : 'up'} />
            <StatCard label="Low-confidence rate" value={stats.lowConfidenceRate} unit="%" icon={<Cpu className="h-5 w-5" />} delta="below 70% threshold" deltaTone="flat" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Per-category performance" subtitle="Precision and recall on the evaluation split" />
              <ul className="space-y-4">
                {stats.perCategory.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-ink-800">{c.category}</span>
                      <span className="ba-num text-ink-500">
                        P {c.precision}% · R {c.recall}% · {formatNumber(c.samples)} samples
                      </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <ProgressBar value={c.precision} tone={c.precision > 90 ? 'emerald' : 'amber'} label={`${c.category} precision`} />
                      <ProgressBar value={c.recall} tone={c.recall > 90 ? 'forest' : 'amber'} label={`${c.category} recall`} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Model card" subtitle="Architecture and training data" icon={<Cpu className="h-5 w-5" />} />
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="ba-label">Backend</dt>
                    <dd className="ba-num mt-0.5 break-words text-xs font-bold text-ink-900">{stats.backend}</dd>
                  </div>
                  <div>
                    <dt className="ba-label">Architecture</dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-ink-700">{stats.architecture}</dd>
                  </div>
                  <div>
                    <dt className="ba-label">Datasets</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {stats.datasets.map((d) => (
                        <Badge key={d} className="bg-forest-50 text-forest-800 border-forest-200">{d}</Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card>
                <CardHeader title="Service contract" subtitle="FastAPI endpoints consumed by the app" icon={<Database className="h-5 w-5" />} />
                <ul className="space-y-2 text-xs">
                  {[
                    { method: 'POST', path: '/api/ai/classify', desc: 'multipart image → category, confidence, alternatives, bin, tip' },
                    { method: 'POST', path: '/api/ai/forecast', desc: 'horizon + history → predicted series with confidence band' },
                    { method: 'GET', path: '/api/ai/model-info', desc: 'architecture, datasets, accuracy, version' },
                    { method: 'GET', path: '/health', desc: 'liveness probe used by the platform monitor' },
                  ].map((e) => (
                    <li key={e.path} className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                      <p className="flex items-center gap-2">
                        <span className="ba-num rounded bg-forest-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{e.method}</span>
                        <span className="ba-num truncate font-bold text-ink-900">{e.path}</span>
                      </p>
                      <p className="mt-1 leading-relaxed text-ink-500">{e.desc}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
