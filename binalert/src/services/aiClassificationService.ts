import type { ClassificationResult, WasteCategory } from '../types';
import { CATEGORY_META } from '../utils/labels';
import { hashString, uid } from '../utils/format';
import { latency, ServiceError } from './storage';

/**
 * AIClassificationService
 *
 * Demo mode runs a deterministic on-device heuristic (image byte signature +
 * filename) so results are stable per image and clearly labelled
 * `source: 'demo'`. When a real FastAPI inference service is deployed, set
 * VITE_AI_API_URL and the same interface proxies to:
 *   POST {VITE_AI_API_URL}/api/ai/classify
 *   GET  {VITE_AI_API_URL}/api/ai/model-info
 */

export const CLASSIFY_STAGES = [
  'Uploading image…',
  'Analyzing image…',
  'Extracting visual features…',
  'Identifying material…',
  'Generating recommendation…',
] as const;

const AI_API_URL: string | undefined = import.meta.env.VITE_AI_API_URL;

export interface ClassifyInput {
  file: File;
  previewUrl?: string;
  onStage?: (stage: string, index: number, total: number) => void;
}

const ITEM_NAMES: Record<WasteCategory, string[]> = {
  plastic: ['PET Water Bottle', 'Plastic Grocery Bag', 'Shampoo Bottle'],
  paper: ['Cardboard Shipping Box', 'Newspaper Bundle', 'Paper Cup'],
  glass: ['Glass Jam Jar', 'Glass Beverage Bottle'],
  metal: ['Aluminium Can', 'Steel Food Tin'],
  organic: ['Banana Peels & Food Scraps', 'Garden Trimmings'],
  'e-waste': ['Old Smartphone', 'Lithium Battery Pack', 'Broken Charger'],
  mixed: ['Mixed Household Waste Bag'],
  other: ['Unclassified Item'],
};

const BASE_CONFIDENCE: Record<WasteCategory, number> = {
  plastic: 94.7,
  paper: 91.2,
  glass: 88.9,
  metal: 92.4,
  organic: 96.3,
  'e-waste': 86.5,
  mixed: 79.8,
  other: 72.4,
};

const WEIGHTS: Record<WasteCategory, number> = {
  plastic: 0.4, paper: 1.1, glass: 0.6, metal: 0.2, organic: 0.9, 'e-waste': 0.3, mixed: 1.6, other: 0.8,
};

const CO2_FACTOR: Record<WasteCategory, number> = {
  plastic: 2.3, paper: 1.4, glass: 1.2, metal: 6.8, organic: 1.2, 'e-waste': 16.0, mixed: 0.4, other: 0.3,
};

/** Mirrors the point values the API awards, so demo and live agree. */
const POINTS_BY_CATEGORY: Record<WasteCategory, number> = {
  plastic: 25, paper: 25, glass: 25, metal: 25, organic: 20, 'e-waste': 40, mixed: 10, other: 10,
};

function categories(): WasteCategory[] {
  return Object.keys(CATEGORY_META) as WasteCategory[];
}

function demoInference(file: File, bytes: Uint8Array): Omit<ClassificationResult, 'id' | 'createdAt' | 'imageUrl'> {
  let sig = hashString(file.name + file.size);
  for (let i = 0; i < bytes.length; i += 97) sig = (sig ^ bytes[i]) * 31 >>> 0;

  const cats = categories();
  const primary = cats[sig % cats.length];
  const confidence = Math.min(98.4, BASE_CONFIDENCE[primary] + ((sig >> 3) % 40) / 10);

  const rest = cats.filter((c) => c !== primary);
  let remainder = 100 - confidence;
  const alternatives = rest.map((c, i) => {
    const weight = ((sig >> (i + 2)) % 7) + 1;
    return { category: c, weight, confidence: 0 };
  });
  const weightSum = alternatives.reduce((s, a) => s + a.weight, 0);
  const alts = alternatives
    .map((a) => ({ category: a.category, confidence: +((a.weight / weightSum) * remainder).toFixed(1) }))
    .sort((a, b) => b.confidence - a.confidence);

  const names = ITEM_NAMES[primary];
  const itemName = names[sig % names.length];
  const meta = CATEGORY_META[primary];
  const weightKg = WEIGHTS[primary];

  return {
    itemName,
    category: primary,
    confidence: +confidence.toFixed(1),
    alternatives: [{ category: primary, confidence: +confidence.toFixed(1) }, ...alts.slice(0, 3)],
    recommendedBin: meta.bin,
    binColor: meta.binColor,
    environmentalTip: meta.tip,
    weightKg,
    co2SavedKg: +(weightKg * CO2_FACTOR[primary]).toFixed(1),
    pointsEarned: POINTS_BY_CATEGORY[primary],
    source: 'demo',
  };
}

async function readSignature(file: File): Promise<Uint8Array> {
  const buf = await file.slice(0, 4096).arrayBuffer();
  return new Uint8Array(buf);
}

/** The inference API reports probabilities as 0–1 fractions; the UI works in 0–100. */
function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return +((value <= 1 ? value * 100 : value)).toFixed(1);
}

function fromApiResponse(data: Record<string, unknown>): Omit<ClassificationResult, 'id' | 'createdAt' | 'imageUrl'> {
  const rawAlternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
  const category = String(data.category) as WasteCategory;
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;

  return {
    itemName: String(data.itemName ?? 'Unidentified item'),
    category: CATEGORY_META[category] ? category : 'other',
    confidence: toPercent(Number(data.confidence)),
    alternatives: rawAlternatives.map((a: { category: string; confidence: number }) => ({
      category: a.category as WasteCategory,
      confidence: toPercent(Number(a.confidence)),
    })),
    recommendedBin: String(data.recommendedBin ?? meta.bin),
    binColor: String(data.binColor ?? meta.binColor),
    environmentalTip: String(data.environmentalTip ?? meta.tip),
    weightKg: Number(data.weightKg ?? 0),
    co2SavedKg: Number(data.co2SavedKg ?? 0),
    pointsEarned: Number(data.pointsEarned ?? 0),
    // Passed through verbatim so the UI can tell the user when a result comes
    // from the deterministic heuristic rather than a trained model.
    mode: data.mode === 'model' ? 'model' : 'heuristic',
    disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
    source: 'api',
  };
}

export const aiClassificationService = {
  mode: AI_API_URL ? ('api' as const) : ('demo' as const),

  async classify({ file, previewUrl, onStage }: ClassifyInput): Promise<ClassificationResult> {
    if (!file.type.startsWith('image/')) {
      throw new ServiceError('unsupported-format', 'That file type is not supported. Upload a PNG, JPG or WEBP image.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new ServiceError('file-too-large', 'Image is larger than 10 MB. Please upload a smaller photo.');
    }

    for (let i = 0; i < CLASSIFY_STAGES.length; i++) {
      onStage?.(CLASSIFY_STAGES[i], i, CLASSIFY_STAGES.length);
      await latency(420, 780);
    }

    if (AI_API_URL) {
      try {
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`${AI_API_URL}/api/ai/classify`, { method: 'POST', body: form });
        if (!res.ok) throw new ServiceError('ai-unavailable', 'The AI service returned an unexpected response.');
        const data = await res.json();
        return {
          ...fromApiResponse(data),
          id: uid('cl'),
          createdAt: new Date().toISOString(),
          imageUrl: previewUrl,
        };
      } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError('ai-unavailable', 'The AI inference service is unreachable. Check back shortly.');
      }
    }

    const bytes = await readSignature(file);
    const result = demoInference(file, bytes);
    return { ...result, id: uid('cl'), createdAt: new Date().toISOString(), imageUrl: previewUrl };
  },

  async modelInfo() {
    await latency(150, 300);
    if (AI_API_URL) {
      const res = await fetch(`${AI_API_URL}/api/ai/model-info`);
      return res.json();
    }
    return {
      backend: 'demo-inference (deterministic on-device heuristic)',
      architecture: 'CNN — ResNet-50 / EfficientNet-B3 (planned production model)',
      datasets: ['TrashNet', 'TACO'],
      categories: categories(),
      accuracy: 94,
      note: 'Demo mode: predictions are simulated for product demonstration. Connect VITE_AI_API_URL to enable live inference.',
    };
  },
};
