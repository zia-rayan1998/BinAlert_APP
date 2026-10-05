import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle2, Cpu, ImagePlus, Lightbulb, RefreshCw, ScanLine, Trash2, Upload } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, CategoryChip } from '../../components/ui/Badge';
import { ConfidenceBar, ErrorState } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { aiClassificationService, CLASSIFY_STAGES } from '../../services/aiClassificationService';
import { classificationsService } from '../../services/classificationsService';
import { authService } from '../../services/authService';
import { notificationsService } from '../../services/notificationsService';
import { ServiceError } from '../../services/storage';
import { CATEGORY_META } from '../../utils/labels';
import type { ClassificationResult } from '../../types';

type Phase = 'idle' | 'preview' | 'analyzing' | 'result' | 'error';

export function Classify() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState({ index: 0, label: CLASSIFY_STAGES[0] as string });
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = useCallback((f: File) => {
    setError('');
    setResult(null);
    if (!f.type.startsWith('image/')) {
      setPhase('error');
      setError('Unsupported format — please upload a PNG, JPG or WEBP image.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setPhase('error');
      setError('That image is larger than 10 MB. Please upload a smaller photo.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase('preview');
  }, []);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  }

  async function run() {
    if (!file || !user) return;
    setPhase('analyzing');
    setStage({ index: 0, label: CLASSIFY_STAGES[0] });
    try {
      const res = await aiClassificationService.classify({
        file,
        previewUrl: preview ?? undefined,
        onStage: (label, index) => setStage({ index, label }),
      });
      setResult(res);
      setPhase('result');
      await classificationsService.save(user.id, res);
      const updated = await authService.awardPoints(user.id, res.pointsEarned, 1);
      setUser(updated);
      notificationsService.push({
        type: 'points',
        title: `+${res.pointsEarned} eco points earned`,
        body: `Your classification of ${res.itemName} was recorded.`,
      });
      toast('success', 'Classification complete', `${res.itemName} → ${res.recommendedBin}`);
    } catch (err) {
      setPhase('error');
      setError(err instanceof ServiceError ? err.message : 'The AI service is unavailable right now. Please try again.');
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setPhase('idle');
    if (inputRef.current) inputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  return (
    <>
      <PageHeader
        breadcrumb="AI computer vision"
        title="Classify Waste"
        subtitle="Upload or capture a photo and let the vision model identify the material, the right bin and an eco tip."
        actions={
          aiClassificationService.mode === 'demo' ? (
            <Badge className="border-amber-200 bg-amber-50 text-amber-800" icon={<Cpu className="h-3.5 w-3.5" />}>
              Demo inference — connect AI API for live model
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: upload / preview */}
        <div className="lg:col-span-3">
          <Card className="!p-0 overflow-hidden">
            <input ref={inputRef} id="classify-upload" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])} />

            {phase === 'idle' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`m-6 flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed px-6 py-16 text-center transition-colors ${dragOver ? 'border-emerald2-500 bg-emerald-50/60' : 'border-ink-200 bg-ink-50/50'}`}
              >
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-forest-800 text-white shadow-lift">
                  <ImagePlus className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink-950">Upload Image</h3>
                <p className="mt-1.5 max-w-xs text-sm text-ink-500">Click to upload or drag and drop. PNG, JPG or WEBP up to 10 MB.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={() => inputRef.current?.click()}>
                    Upload Image
                  </Button>
                  <Button variant="outline" icon={<Camera className="h-4 w-4" />} onClick={() => cameraRef.current?.click()}>
                    Use Camera
                  </Button>
                </div>
              </div>
            )}

            {(phase === 'preview' || phase === 'analyzing') && preview && (
              <div className="relative">
                <img src={preview} alt="Waste item preview" className="max-h-[26rem] w-full object-contain bg-ink-950" />
                {phase === 'analyzing' && (
                  <div className="absolute inset-0 bg-forest-950/70 backdrop-blur-[2px]">
                    <div className="absolute inset-x-0 h-1 animate-scan-line bg-gradient-to-r from-transparent via-emerald2-400 to-transparent shadow-glow" aria-hidden />
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-emerald2-500/20 ring-1 ring-emerald2-400/50">
                        <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-emerald2-500/30" aria-hidden />
                        <ScanLine className="h-7 w-7 text-emerald2-300" />
                      </span>
                      <div>
                        <p className="text-base font-bold text-white" role="status" aria-live="polite">{stage.label}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald2-300">
                          Step {stage.index + 1} of {CLASSIFY_STAGES.length}
                        </p>
                      </div>
                      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-forest-800">
                        <div className="h-full rounded-full bg-emerald2-400 transition-all duration-500" style={{ width: `${((stage.index + 1) / CLASSIFY_STAGES.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === 'result' && result?.imageUrl && (
              <img src={result.imageUrl} alt={`Classified item: ${result.itemName}`} className="max-h-[26rem] w-full object-contain bg-ink-950" />
            )}

            {phase === 'error' && (
              <div className="p-6">
                <ErrorState title="We couldn't process that image" body={error} onRetry={reset} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
              <p className="truncate text-xs font-medium text-ink-400">{file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : 'No file selected'}</p>
              <div className="flex gap-2">
                {phase !== 'idle' && (
                  <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={reset}>
                    Remove
                  </Button>
                )}
                {phase === 'preview' && (
                  <Button variant="secondary" icon={<ScanLine className="h-4 w-4" />} onClick={run}>
                    Classify Waste
                  </Button>
                )}
                {phase === 'result' && (
                  <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={reset}>
                    Classify Another Item
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: result panel */}
        <div className="lg:col-span-2">
          {phase === 'result' && result ? (
            <Card className="animate-fade-up">
              <div className="flex items-center justify-between gap-3">
                <p className="ba-label">AI Classification Result</p>
                {result.source === 'api' && result.mode === 'model' ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                    Live model
                  </Badge>
                ) : (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                    {result.source === 'demo' ? 'Demo inference' : 'Heuristic — no trained model'}
                  </Badge>
                )}
              </div>

              {result.disclaimer && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  {result.disclaimer}
                </p>
              )}

              <div className="mt-4 flex items-center gap-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `${result.binColor}1a`, color: result.binColor }}>
                  <ScanLine className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-ink-950">{result.itemName}</p>
                  <div className="mt-1"><CategoryChip category={result.category} /></div>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-500">Confidence</dt>
                  <dd className="ba-num font-extrabold text-emerald2-600">{result.confidence}%</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-500">Recommended Bin</dt>
                  <dd className="flex items-center gap-2 font-bold text-ink-900">
                    <span className="h-3 w-3 rounded-full" style={{ background: result.binColor }} aria-hidden />
                    {result.recommendedBin}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-500">Est. weight</dt>
                  <dd className="ba-num font-bold text-ink-900">{result.weightKg} kg</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-500">CO₂e avoided</dt>
                  <dd className="ba-num font-bold text-ink-900">{result.co2SavedKg} kg</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-500">Points earned</dt>
                  <dd className="ba-num font-bold text-emerald2-600">+{result.pointsEarned}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="ba-label mb-3">Prediction breakdown</p>
                <div className="space-y-2.5">
                  {result.alternatives.map((a) => (
                    <ConfidenceBar key={a.category} label={CATEGORY_META[a.category].label} value={a.confidence} active={a.category === result.category} />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Environmental tip</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-900">{result.environmentalTip}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link to="/reports">
                  <Button variant="outline" className="w-full" size="sm">View history</Button>
                </Link>
                <Link to="/eco-points">
                  <Button variant="outline" className="w-full" size="sm">See points</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="h-full">
              <p className="ba-label">What you'll get</p>
              <ul className="mt-4 space-y-4">
                {[
                  ['Detected item & category', 'The model names the item and maps it to one of eight waste categories.'],
                  ['Confidence & alternatives', 'A ranked probability breakdown so you can see how sure the model is.'],
                  ['Recommended bin', 'Colour-coded bin or drop-off point, matched to your municipality\'s scheme.'],
                  ['Environmental tip', 'One practical action that improves the outcome for this material.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                <p className="text-xs leading-relaxed text-ink-500">
                  <strong className="font-bold text-ink-700">Privacy:</strong> images are validated client-side (type &
                  size) before upload and are only used to produce this classification.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
