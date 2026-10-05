export type Role = 'citizen' | 'worker' | 'municipality' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  location: string;
  joinedAt: string;
  ecoScore: number;
  points: number;
  level: number;
  badges: string[];
  avatarHue: number;
}

export type WasteCategory =
  | 'plastic'
  | 'paper'
  | 'glass'
  | 'metal'
  | 'organic'
  | 'e-waste'
  | 'mixed'
  | 'other';

export interface CategoryPrediction {
  category: WasteCategory;
  confidence: number;
}

export interface ClassificationResult {
  id: string;
  itemName: string;
  category: WasteCategory;
  confidence: number;
  alternatives: CategoryPrediction[];
  recommendedBin: string;
  binColor: string;
  environmentalTip: string;
  weightKg: number;
  co2SavedKg: number;
  pointsEarned: number;
  createdAt: string;
  source: 'demo' | 'api';
  /** How the result was produced. `heuristic` means no trained model ran. */
  mode?: 'heuristic' | 'model';
  /** Verbatim caveat from the inference service, shown to the user when present. */
  disclaimer?: string;
  imageUrl?: string;
}

export type ReportType =
  | 'overflowing-bin'
  | 'illegal-dumping'
  | 'uncollected-waste'
  | 'roadside-waste'
  | 'mixed-waste'
  | 'hazardous-waste'
  | 'other';

export type ReportStatus = 'submitted' | 'assigned' | 'in-progress' | 'resolved';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  zone: string;
}

export interface TimelineEvent {
  status: ReportStatus | 'created' | 'note';
  at: string;
  by: string;
  note?: string;
}

export interface WasteReport {
  id: string;
  userId: string;
  userName: string;
  type: ReportType;
  description: string;
  location: GeoPoint;
  priority: Priority;
  status: ReportStatus;
  notes: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  assignedWorker?: string;
  resolutionNotes?: string;
}

export type BinStatus = 'normal' | 'attention' | 'high' | 'critical';

export interface Bin {
  id: string;
  label: string;
  zone: string;
  lat: number;
  lng: number;
  status: BinStatus;
  fillLevel: number;
  accepted: WasteCategory[];
  lastCollectedAt: string;
}

export interface CollectionVehicle {
  id: string;
  name: string;
  plate: string;
  status: 'active' | 'idle' | 'maintenance';
  lat: number;
  lng: number;
  routeId: string;
  driver: string;
}

export interface CollectionRun {
  id: string;
  routeId: string;
  routeName: string;
  zone: string;
  vehicle: string;
  worker: string;
  date: string;
  window: string;
  stops: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed';
}

export interface CollectionRoute {
  id: string;
  name: string;
  zone: string;
  path: [number, number][];
  stops: number;
  distanceKm: number;
  durationMin: number;
  optimized: {
    distanceKm: number;
    durationMin: number;
    fuelSavedL: number;
    improvementPct: number;
  };
}

export interface AppNotification {
  id: string;
  type:
    | 'report-submitted'
    | 'report-assigned'
    | 'status-changed'
    | 'resolved'
    | 'collection'
    | 'achievement'
    | 'points';
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  zone: string;
  points: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface ForecastPoint {
  label: string;
  actual?: number;
  predicted?: number;
  bandLow?: number;
  bandHigh?: number;
}

export interface MunicipalityKpis {
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  overflowingBins: number;
  collectionEfficiency: number;
  recyclingRate: number;
  wasteDivertedKg: number;
  landfillReductionPct: number;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
