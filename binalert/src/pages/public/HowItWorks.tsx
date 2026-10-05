import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, ScanLine, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeading } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CATEGORY_META } from '../../utils/labels';
import type { WasteCategory } from '../../types';

const STEPS = [
  {
    n: 1,
    icon: Camera,
    title: 'Capture Waste',
    body: 'Upload an image, take a photo or use your camera directly inside BinAlert. PNG, JPG and WEBP up to 10 MB.',
  },
  {
    n: 2,
    icon: ScanLine,
    title: 'AI Analysis',
    body: 'The computer-vision model normalises, resizes and analyses the image, extracting material features frame by frame.',
  },
  {
    n: 3,
    icon: Sparkles,
    title: 'Waste Classification',
    body: 'The item is placed into one of eight categories with a confidence score and ranked alternative predictions.',
  },
  {
    n: 4,
    icon: CheckCircle2,
    title: 'Recommended Disposal',
    body: 'You get the exact bin or drop-off point to use, colour-coded, plus an environmental tip for that material.',
  },
  {
    n: 5,
    icon: TrendingUp,
    title: 'Impact Tracking',
    body: 'The classification is stored, your eco points update, and city analytics and forecasts refresh in real time.',
  },
];

const CATEGORIES = Object.keys(CATEGORY_META) as WasteCategory[];

export function HowItWorks() {
  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="ba-container py-20">
          <SectionHeading
            eyebrow="How It Works"
            title="A five-step loop from photo to city-wide impact"
            subtitle="The same flow powers a citizen sorting lunch waste and a municipality planning next month's fleet schedule."
          />
        </div>
      </section>

      <section className="ba-container py-16 lg:py-20">
        <ol className="relative space-y-6 before:absolute before:inset-y-4 before:left-[27px] before:w-0.5 before:bg-gradient-to-b before:from-emerald2-400 before:via-forest-400 before:to-forest-800 lg:space-y-8">
          {STEPS.map((step) => (
            <li key={step.n} className="relative flex gap-6">
              <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-forest-900 text-white shadow-lift ring-4 ring-canvas">
                <step.icon className="h-6 w-6" />
              </span>
              <Card className="flex-1 transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="ba-num text-sm font-extrabold text-emerald2-600">STEP {step.n}</span>
                  <span className="h-px flex-1 bg-ink-100" aria-hidden />
                </div>
                <h3 className="mt-2 text-lg font-bold text-ink-950">{step.title}</h3>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-100 bg-white py-16 lg:py-20">
        <div className="ba-container">
          <SectionHeading
            eyebrow="Step 3 in detail"
            title="Eight categories, one confident answer"
            subtitle="The classifier is trained to distinguish the materials that actually matter in municipal streams."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div key={c} className="rounded-xl2 border border-ink-100 bg-canvas p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card">
                <span className="mx-auto block h-3 w-10 rounded-full" style={{ background: CATEGORY_META[c].binColor }} aria-hidden />
                <p className="mt-3 text-sm font-bold text-ink-900">{CATEGORY_META[c].label}</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-400">{CATEGORY_META[c].bin}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Confidence scores on every prediction</Badge>
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">Ranked alternative predictions</Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-800">Material-specific eco tips</Badge>
          </div>
          <div className="mt-10 text-center">
            <Link to="/classify">
              <Button size="lg" variant="secondary" iconRight={<ArrowRight className="h-4 w-4" />}>
                Classify an item now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
