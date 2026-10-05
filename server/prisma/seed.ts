/**
 * BinAlert demo seed.
 *
 *   npm run db:seed        (from server/)
 *
 * Wipes and repopulates every table so the database always matches the sample
 * city the UI was designed around. All accounts share `SEED_PASSWORD`
 * (default `demo1234`) — never reuse these credentials outside local dev.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import type { BinStatus, Role, WasteCategory } from '@prisma/client';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

const daysAgo = (days: number, hours = 0) => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
};

const CATEGORIES: {
  category: WasteCategory;
  label: string;
  recommendedBin: string;
  binColor: string;
  environmentalTip: string;
}[] = [
  { category: 'PLASTIC', label: 'Plastic', recommendedBin: 'Blue recycling bin', binColor: '#2563eb', environmentalTip: 'Rinse containers and keep caps on — loose caps fall through sorting screens.' },
  { category: 'PAPER', label: 'Paper & Card', recommendedBin: 'Blue recycling bin', binColor: '#0ea5e9', environmentalTip: 'Keep paper dry and flatten cardboard to save collection space.' },
  { category: 'GLASS', label: 'Glass', recommendedBin: 'Green recycling bin', binColor: '#16a34a', environmentalTip: 'Glass can be recycled endlessly without losing quality.' },
  { category: 'METAL', label: 'Metal', recommendedBin: 'Green recycling bin', binColor: '#64748b', environmentalTip: 'Recycling aluminium saves about 95% of the energy of making it from ore.' },
  { category: 'ORGANIC', label: 'Organic', recommendedBin: 'Brown compost bin', binColor: '#a16207', environmentalTip: 'Composting food waste avoids methane from landfill.' },
  { category: 'E_WASTE', label: 'E-Waste', recommendedBin: 'Specialist e-waste point', binColor: '#7c3aed', environmentalTip: 'Never bin batteries or devices — they leak heavy metals and can start fires.' },
  { category: 'MIXED', label: 'Mixed waste', recommendedBin: 'Grey general waste bin', binColor: '#475569', environmentalTip: 'Mixed bags are hard to recycle — separating at home doubles recovery rates.' },
  { category: 'OTHER', label: 'Other', recommendedBin: 'Grey general waste bin', binColor: '#94a3b8', environmentalTip: 'When unsure, check the item label or ask at your nearest recycling point.' },
];

const ZONES = ['Zone A — Riverside', 'Zone B — Old Town', 'Zone C — Tech Park'];

const BINS: { code: string; label: string; zone: string; lat: number; lng: number; status: BinStatus; fillLevel: number; accepted: WasteCategory[] }[] = [
  { code: 'BIN-A01', label: 'Riverside Promenade North', zone: ZONES[0], lat: 17.3941, lng: 78.4803, status: 'CRITICAL', fillLevel: 96, accepted: ['MIXED'] },
  { code: 'BIN-A02', label: 'Riverside Promenade South', zone: ZONES[0], lat: 17.3918, lng: 78.4829, status: 'ATTENTION', fillLevel: 71, accepted: ['PLASTIC', 'PAPER', 'METAL'] },
  { code: 'BIN-A03', label: 'Greenview Apartments', zone: ZONES[0], lat: 17.3861, lng: 78.4795, status: 'HIGH', fillLevel: 84, accepted: ['MIXED', 'ORGANIC'] },
  { code: 'BIN-A04', label: 'Riverside Park Entrance', zone: ZONES[0], lat: 17.3889, lng: 78.4771, status: 'NORMAL', fillLevel: 38, accepted: ['PLASTIC', 'PAPER', 'GLASS', 'METAL'] },
  { code: 'BIN-A05', label: 'Lane 4 Cluster', zone: ZONES[0], lat: 17.3902, lng: 78.4867, status: 'NORMAL', fillLevel: 44, accepted: ['MIXED'] },
  { code: 'BIN-A06', label: 'Boathouse Jetty', zone: ZONES[0], lat: 17.3956, lng: 78.4848, status: 'ATTENTION', fillLevel: 68, accepted: ['PLASTIC', 'ORGANIC'] },
  { code: 'BIN-B01', label: 'Old Town Market Square', zone: ZONES[1], lat: 17.3788, lng: 78.4889, status: 'CRITICAL', fillLevel: 92, accepted: ['MIXED', 'ORGANIC'] },
  { code: 'BIN-B02', label: 'Heritage Street Corner', zone: ZONES[1], lat: 17.3801, lng: 78.4912, status: 'HIGH', fillLevel: 81, accepted: ['MIXED'] },
  { code: 'BIN-B03', label: 'Community Hall', zone: ZONES[1], lat: 17.3812, lng: 78.4921, status: 'ATTENTION', fillLevel: 66, accepted: ['PAPER', 'PLASTIC'] },
  { code: 'BIN-B04', label: 'Transfer Point 2', zone: ZONES[1], lat: 17.3742, lng: 78.4963, status: 'HIGH', fillLevel: 88, accepted: ['MIXED'] },
  { code: 'BIN-B05', label: 'Clock Tower Plaza', zone: ZONES[1], lat: 17.3769, lng: 78.4871, status: 'NORMAL', fillLevel: 31, accepted: ['PLASTIC', 'PAPER', 'GLASS', 'METAL'] },
  { code: 'BIN-B06', label: 'Textile Market Rear', zone: ZONES[1], lat: 17.3755, lng: 78.4902, status: 'NORMAL', fillLevel: 52, accepted: ['MIXED'] },
  { code: 'BIN-C01', label: 'Tech Park Food Court', zone: ZONES[2], lat: 17.4035, lng: 78.4978, status: 'HIGH', fillLevel: 79, accepted: ['ORGANIC', 'MIXED'] },
  { code: 'BIN-C02', label: 'Innovation Tower Lobby', zone: ZONES[2], lat: 17.4011, lng: 78.5004, status: 'NORMAL', fillLevel: 27, accepted: ['PAPER', 'PLASTIC', 'METAL', 'E_WASTE'] },
  { code: 'BIN-C03', label: 'Sector 7 Storm Drain', zone: ZONES[2], lat: 17.3968, lng: 78.5041, status: 'ATTENTION', fillLevel: 63, accepted: ['MIXED'] },
  { code: 'BIN-C04', label: 'Tech Park Gate 2', zone: ZONES[2], lat: 17.3994, lng: 78.4955, status: 'NORMAL', fillLevel: 41, accepted: ['PLASTIC', 'PAPER', 'GLASS', 'METAL'] },
  { code: 'BIN-C05', label: 'Data Center Perimeter', zone: ZONES[2], lat: 17.4058, lng: 78.5022, status: 'NORMAL', fillLevel: 22, accepted: ['E_WASTE', 'METAL'] },
  { code: 'BIN-C06', label: 'Transit Hub East', zone: ZONES[2], lat: 17.3982, lng: 78.5071, status: 'ATTENTION', fillLevel: 74, accepted: ['MIXED', 'PLASTIC'] },
];

const ROUTES = [
  {
    name: 'Riverside Loop',
    zone: ZONES[0],
    stops: 6,
    distanceKm: 11.4,
    durationMin: 95,
    path: [[17.3956, 78.4848], [17.3941, 78.4803], [17.3918, 78.4829], [17.3902, 78.4867], [17.3889, 78.4771], [17.3861, 78.4795]],
    optimizedDistanceKm: 8.9,
    optimizedDurationMin: 74,
    fuelSavedL: 3.1,
    improvementPct: 22,
  },
  {
    name: 'Old Town Circuit',
    zone: ZONES[1],
    stops: 6,
    distanceKm: 9.8,
    durationMin: 88,
    path: [[17.3788, 78.4889], [17.3801, 78.4912], [17.3812, 78.4921], [17.3769, 78.4871], [17.3755, 78.4902], [17.3742, 78.4963]],
    optimizedDistanceKm: 7.6,
    optimizedDurationMin: 69,
    fuelSavedL: 2.6,
    improvementPct: 21,
  },
  {
    name: 'Tech Park Sweep',
    zone: ZONES[2],
    stops: 6,
    distanceKm: 12.6,
    durationMin: 102,
    path: [[17.3994, 78.4955], [17.4011, 78.5004], [17.4035, 78.4978], [17.4058, 78.5022], [17.3982, 78.5071], [17.3968, 78.5041]],
    optimizedDistanceKm: 10.1,
    optimizedDurationMin: 81,
    fuelSavedL: 3.4,
    improvementPct: 20,
  },
];

const VEHICLES = [
  { name: 'Compactor Alpha', plate: 'TS-09-BA-1041', status: 'active', lat: 17.3925, lng: 78.4836, route: ROUTES[0], driver: 'Ravi Kumar' },
  { name: 'Compactor Beta', plate: 'TS-09-BA-1042', status: 'active', lat: 17.3781, lng: 78.4905, route: ROUTES[1], driver: 'S. Prakash' },
  { name: 'EV Sweeper Gamma', plate: 'TS-09-BA-1043', status: 'idle', lat: 17.4002, lng: 78.4991, route: ROUTES[2], driver: 'A. Reddy' },
  { name: 'Hazmat Unit Delta', plate: 'TS-09-BA-1044', status: 'maintenance', lat: 17.385, lng: 78.495, route: ROUTES[1], driver: null },
];

const BADGES = [
  { key: 'first-report', name: 'First Report', description: 'Submitted your first waste report', icon: 'flag', threshold: 1 },
  { key: 'sorting-hero', name: 'Waste Sorting Hero', description: 'Classified 10 items correctly', icon: 'scan', threshold: 10 },
  { key: 'recycling-champion', name: 'Recycling Champion', description: 'Classified 25 recyclable items', icon: 'recycle', threshold: 25 },
  { key: 'clean-street', name: 'Clean Street Contributor', description: '5 resolved roadside reports', icon: 'sparkles', threshold: 5 },
  { key: 'eco-warrior', name: 'Eco Warrior', description: 'Reached 2,000 eco points', icon: 'shield', threshold: 2000 },
];

const RECYCLING_CENTERS = [
  { name: 'Riverside MRF', zone: ZONES[0], latitude: 17.3875, longitude: 78.4758, accepts: ['Plastic', 'Paper', 'Metal', 'Glass'], throughputKgDay: 4200 },
  { name: 'Old Town Compost Hub', zone: ZONES[1], latitude: 17.3726, longitude: 78.4934, accepts: ['Organic'], throughputKgDay: 2600 },
  { name: 'Tech Park E-Waste Point', zone: ZONES[2], latitude: 17.4072, longitude: 78.5051, accepts: ['E-Waste', 'Metal'], throughputKgDay: 900 },
];

const CLASSIFICATION_SAMPLES: { itemName: string; category: WasteCategory; confidence: number; weightKg: number; co2SavedKg: number }[] = [
  { itemName: 'PET water bottle', category: 'PLASTIC', confidence: 0.96, weightKg: 0.02, co2SavedKg: 0.05 },
  { itemName: 'Corrugated cardboard box', category: 'PAPER', confidence: 0.93, weightKg: 0.4, co2SavedKg: 0.62 },
  { itemName: 'Glass jar', category: 'GLASS', confidence: 0.91, weightKg: 0.35, co2SavedKg: 0.31 },
  { itemName: 'Aluminium can', category: 'METAL', confidence: 0.97, weightKg: 0.02, co2SavedKg: 0.11 },
  { itemName: 'Fruit and vegetable scraps', category: 'ORGANIC', confidence: 0.88, weightKg: 0.6, co2SavedKg: 0.42 },
  { itemName: 'Old smartphone', category: 'E_WASTE', confidence: 0.94, weightKg: 0.2, co2SavedKg: 1.4 },
];

async function main() {
  console.log('[seed] Clearing existing data…');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.forecastResult.deleteMany();
  await prisma.analyticsSnapshot.deleteMany();
  await prisma.recyclingCenter.deleteMany();
  await prisma.collectionRun.deleteMany();
  await prisma.collectionVehicle.deleteMany();
  await prisma.collectionRoute.deleteMany();
  await prisma.binStatusEvent.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.alternativePrediction.deleteMany();
  await prisma.wasteClassification.deleteMany();
  await prisma.wasteCategoryDef.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.wasteReport.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.municipality.deleteMany();

  console.log('[seed] Creating municipalities and zones…');
  const municipality = await prisma.municipality.create({
    data: {
      name: 'Riverside Municipal Corporation',
      city: 'Hyderabad',
      plan: 'Enterprise',
      status: 'active',
      population: 482000,
      recyclingRate: 61.2,
      contactEmail: 'operations@riverside.example.org',
    },
  });
  await prisma.municipality.createMany({
    data: [
      { name: 'Old Town City Council', city: 'Hyderabad', plan: 'Professional', status: 'active', population: 214000, recyclingRate: 48.6, contactEmail: 'council@oldtown.example.org' },
      { name: 'Tech Park Special Zone Authority', city: 'Hyderabad', plan: 'Starter', status: 'trial', population: 96000, recyclingRate: 39.4, contactEmail: 'admin@techpark.example.org' },
    ],
  });

  const zones: Record<string, string> = {};
  for (const name of ZONES) {
    const zone = await prisma.zone.create({ data: { name, municipalityId: municipality.id } });
    zones[name] = zone.id;
  }

  console.log('[seed] Creating users…');
  const passwordHash = await bcrypt.hash(env.SEED_PASSWORD, env.BCRYPT_ROUNDS);
  const mkUser = (name: string, email: string, role: Role, location: string, points: number, avatarHue: number) =>
    prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        location,
        avatarHue,
        municipalityId: municipality.id,
        points,
        level: levelFor(points),
        ecoScore: 50 + Math.round(points / 40),
      },
    });

  const citizen = await mkUser('Alex Fernandes', 'citizen@binalert.io', 'CITIZEN', ZONES[0], 2450, 152);
  await mkUser('Priya Nair', 'priya.nair@example.com', 'CITIZEN', ZONES[1], 4820, 96);
  await mkUser('Arjun Mehta', 'arjun.mehta@example.com', 'CITIZEN', ZONES[2], 3960, 210);
  await mkUser('Sana Qureshi', 'sana.qureshi@example.com', 'CITIZEN', ZONES[0], 3110, 32);
  const worker = await mkUser('Ravi Kumar', 'worker@binalert.io', 'WORKER', ZONES[0], 640, 18);
  await mkUser('S. Prakash', 's.prakash@example.com', 'WORKER', ZONES[1], 420, 268);
  await mkUser('A. Reddy', 'a.reddy@example.com', 'WORKER', ZONES[2], 310, 128);
  await mkUser('Meera Iyer', 'municipality@binalert.io', 'MUNICIPALITY_ADMIN', ZONES[0], 0, 200);
  await mkUser('System Administrator', 'admin@binalert.io', 'SYSTEM_ADMIN', ZONES[0], 0, 240);

  console.log('[seed] Creating categories, badges and facilities…');
  for (const c of CATEGORIES) {
    await prisma.wasteCategoryDef.create({ data: c });
  }
  for (const b of BADGES) {
    await prisma.badge.create({ data: b });
  }
  await prisma.recyclingCenter.createMany({ data: RECYCLING_CENTERS });

  console.log('[seed] Creating bins…');
  for (const bin of BINS) {
    const created = await prisma.bin.create({
      data: {
        code: bin.code,
        label: bin.label,
        zoneId: zones[bin.zone],
        municipalityId: municipality.id,
        latitude: bin.lat,
        longitude: bin.lng,
        status: bin.status,
        fillLevel: bin.fillLevel,
        accepted: bin.accepted,
        lastCollectedAt: daysAgo(bin.status === 'NORMAL' ? 1 : 3),
      },
    });
    await prisma.binStatusEvent.create({
      data: { binId: created.id, status: created.status, fillLevel: created.fillLevel, createdAt: daysAgo(1, 4) },
    });
  }

  console.log('[seed] Creating routes, vehicles and runs…');
  const routeIds: Record<string, string> = {};
  for (const route of ROUTES) {
    const created = await prisma.collectionRoute.create({
      data: {
        name: route.name,
        zoneId: zones[route.zone],
        municipalityId: municipality.id,
        stops: route.stops,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        path: route.path,
        optimizedDistanceKm: route.optimizedDistanceKm,
        optimizedDurationMin: route.optimizedDurationMin,
        fuelSavedL: route.fuelSavedL,
        improvementPct: route.improvementPct,
      },
    });
    routeIds[route.name] = created.id;
  }

  for (const v of VEHICLES) {
    await prisma.collectionVehicle.create({
      data: {
        name: v.name,
        plate: v.plate,
        status: v.status,
        driver: v.driver,
        latitude: v.lat,
        longitude: v.lng,
        routeId: routeIds[v.route.name],
      },
    });
  }

  const alpha = await prisma.collectionVehicle.findUniqueOrThrow({ where: { plate: 'TS-09-BA-1041' } });
  const beta = await prisma.collectionVehicle.findUniqueOrThrow({ where: { plate: 'TS-09-BA-1042' } });
  const gamma = await prisma.collectionVehicle.findUniqueOrThrow({ where: { plate: 'TS-09-BA-1043' } });

  const RUNS: { ref: string; route: string; vehicleId: string; worker: string; day: number; window: string; status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' }[] = [
    { ref: 'CR-2201', route: ROUTES[0].name, vehicleId: alpha.id, worker: 'Ravi Kumar', day: 0, window: '06:00 – 09:30', status: 'IN_PROGRESS' },
    { ref: 'CR-2202', route: ROUTES[1].name, vehicleId: beta.id, worker: 'S. Prakash', day: 0, window: '07:00 – 10:30', status: 'IN_PROGRESS' },
    { ref: 'CR-2203', route: ROUTES[2].name, vehicleId: gamma.id, worker: 'A. Reddy', day: 0, window: '14:00 – 17:00', status: 'SCHEDULED' },
    { ref: 'CR-2198', route: ROUTES[0].name, vehicleId: alpha.id, worker: 'Ravi Kumar', day: 1, window: '06:00 – 09:30', status: 'COMPLETED' },
    { ref: 'CR-2199', route: ROUTES[1].name, vehicleId: beta.id, worker: 'S. Prakash', day: 1, window: '07:00 – 10:30', status: 'COMPLETED' },
    { ref: 'CR-2200', route: ROUTES[2].name, vehicleId: gamma.id, worker: 'A. Reddy', day: 1, window: '14:00 – 17:00', status: 'MISSED' },
    { ref: 'CR-2194', route: ROUTES[0].name, vehicleId: alpha.id, worker: 'Ravi Kumar', day: 2, window: '06:00 – 09:30', status: 'COMPLETED' },
    { ref: 'CR-2195', route: ROUTES[1].name, vehicleId: beta.id, worker: 'S. Prakash', day: 2, window: '07:00 – 10:30', status: 'COMPLETED' },
  ];
  for (const run of RUNS) {
    await prisma.collectionRun.create({
      data: {
        reference: run.ref,
        routeId: routeIds[run.route],
        vehicleId: run.vehicleId,
        worker: run.worker,
        date: daysAgo(run.day),
        window: run.window,
        stops: 6,
        status: run.status,
      },
    });
  }

  console.log('[seed] Creating classifications and points…');
  for (let i = 0; i < CLASSIFICATION_SAMPLES.length; i++) {
    const sample = CLASSIFICATION_SAMPLES[i];
    const def = await prisma.wasteCategoryDef.findUniqueOrThrow({ where: { category: sample.category } });
    await prisma.wasteClassification.create({
      data: {
        userId: citizen.id,
        categoryDefId: def.id,
        category: sample.category,
        itemName: sample.itemName,
        confidence: sample.confidence,
        recommendedBin: def.recommendedBin,
        binColor: def.binColor,
        environmentalTip: def.environmentalTip,
        weightKg: sample.weightKg,
        co2SavedKg: sample.co2SavedKg,
        pointsEarned: sample.category === 'E_WASTE' ? 40 : sample.category === 'ORGANIC' ? 20 : 25,
        source: 'demo',
        modelId: 'demo-inference v1.4.2',
        latencyMs: 480 + i * 37,
        createdAt: daysAgo(i, 2),
      },
    });
    await prisma.pointTransaction.create({
      data: { userId: citizen.id, amount: 25, reason: `Classified ${sample.itemName}`, createdAt: daysAgo(i, 2) },
    });
  }

  console.log('[seed] Creating reports…');
  const REPORTS: {
    ref: string;
    type: 'OVERFLOWING_BIN' | 'ILLEGAL_DUMPING' | 'UNCOLLECTED_WASTE' | 'ROADSIDE_WASTE' | 'MIXED_WASTE' | 'HAZARDOUS_WASTE' | 'OTHER';
    description: string;
    landmark: string;
    zone: string;
    lat: number;
    lng: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
    day: number;
    mine: boolean;
  }[] = [
    { ref: 'BA-2026-00148', type: 'OVERFLOWING_BIN', description: 'Bin overflowing onto the footpath outside the promenade entrance.', landmark: 'Riverside Promenade North', zone: ZONES[0], lat: 17.3941, lng: 78.4803, priority: 'HIGH', status: 'SUBMITTED', day: 0, mine: true },
    { ref: 'BA-2026-00147', type: 'ILLEGAL_DUMPING', description: 'Construction debris dumped beside the service road overnight.', landmark: 'Sector 7 Storm Drain', zone: ZONES[2], lat: 17.3968, lng: 78.5041, priority: 'CRITICAL', status: 'IN_PROGRESS', day: 1, mine: true },
    { ref: 'BA-2026-00146', type: 'ROADSIDE_WASTE', description: 'Plastic packaging scattered along the market approach lane.', landmark: 'Textile Market Rear', zone: ZONES[1], lat: 17.3755, lng: 78.4902, priority: 'MEDIUM', status: 'RESOLVED', day: 2, mine: true },
    { ref: 'BA-2026-00145', type: 'MIXED_WASTE', description: 'Recyclables mixed into the general waste bin at the community hall.', landmark: 'Community Hall', zone: ZONES[1], lat: 17.3812, lng: 78.4921, priority: 'LOW', status: 'RESOLVED', day: 3, mine: false },
    { ref: 'BA-2026-00144', type: 'HAZARDOUS_WASTE', description: 'Discarded paint cans leaking near the park entrance.', landmark: 'Riverside Park Entrance', zone: ZONES[0], lat: 17.3889, lng: 78.4771, priority: 'CRITICAL', status: 'ASSIGNED', day: 3, mine: false },
    { ref: 'BA-2026-00143', type: 'UNCOLLECTED_WASTE', description: 'Collection missed for three consecutive days on this street.', landmark: 'Lane 4 Cluster', zone: ZONES[0], lat: 17.3902, lng: 78.4867, priority: 'HIGH', status: 'IN_PROGRESS', day: 4, mine: false },
    { ref: 'BA-2026-00142', type: 'OVERFLOWING_BIN', description: 'Market square bin overflowing after the weekend trade.', landmark: 'Old Town Market Square', zone: ZONES[1], lat: 17.3788, lng: 78.4889, priority: 'HIGH', status: 'RESOLVED', day: 5, mine: false },
    { ref: 'BA-2026-00141', type: 'ROADSIDE_WASTE', description: 'Food waste accumulating near the tech park food court.', landmark: 'Tech Park Food Court', zone: ZONES[2], lat: 17.4035, lng: 78.4978, priority: 'MEDIUM', status: 'RESOLVED', day: 6, mine: false },
    { ref: 'BA-2026-00140', type: 'OTHER', description: 'Broken glass reported on the transit hub walkway.', landmark: 'Transit Hub East', zone: ZONES[2], lat: 17.3982, lng: 78.5071, priority: 'MEDIUM', status: 'SUBMITTED', day: 7, mine: false },
    { ref: 'BA-2026-00139', type: 'ILLEGAL_DUMPING', description: 'Household waste dumped at the transfer point after hours.', landmark: 'Transfer Point 2', zone: ZONES[1], lat: 17.3742, lng: 78.4963, priority: 'HIGH', status: 'RESOLVED', day: 9, mine: false },
  ];

  for (const r of REPORTS) {
    const author = r.mine ? citizen : await prisma.user.findFirstOrThrow({ where: { role: 'CITIZEN', email: { not: 'citizen@binalert.io' } } });
    const report = await prisma.wasteReport.create({
      data: {
        reference: r.ref,
        type: r.type,
        description: r.description,
        landmark: r.landmark,
        zoneId: zones[r.zone],
        latitude: r.lat,
        longitude: r.lng,
        priority: r.priority,
        status: r.status,
        userId: author.id,
        assignedWorkerId: r.status === 'SUBMITTED' ? null : worker.id,
        resolvedAt: r.status === 'RESOLVED' ? daysAgo(Math.max(0, r.day - 1)) : null,
        resolutionNotes: r.status === 'RESOLVED' ? 'Crew attended the site, waste cleared and the area washed down.' : null,
        createdAt: daysAgo(r.day, 3),
        timeline: {
          create: [
            { status: 'CREATED', actor: author.name, createdAt: daysAgo(r.day, 3) },
            { status: 'SUBMITTED', actor: 'System', createdAt: daysAgo(r.day, 3) },
            ...(r.status === 'SUBMITTED'
              ? []
              : [{ status: 'ASSIGNED', actor: 'Meera Iyer', note: `Assigned to ${worker.name}`, createdAt: daysAgo(Math.max(0, r.day - 1), 2) }]),
            ...(r.status === 'IN_PROGRESS' || r.status === 'RESOLVED'
              ? [{ status: 'IN_PROGRESS', actor: worker.name, note: 'Crew en route to the site.', createdAt: daysAgo(Math.max(0, r.day - 1), 1) }]
              : []),
            ...(r.status === 'RESOLVED'
              ? [{ status: 'RESOLVED', actor: worker.name, note: 'Cleared and verified on site.', createdAt: daysAgo(Math.max(0, r.day - 1)) }]
              : []),
          ],
        },
      },
    });
    await prisma.pointTransaction.create({
      data: { userId: author.id, amount: 30, reason: `Reported ${r.type.toLowerCase().replace(/_/g, ' ')}`, createdAt: daysAgo(r.day, 3) },
    });
    void report;
  }

  console.log('[seed] Creating notifications, badges and audit trail…');
  await prisma.notification.createMany({
    data: [
      { userId: citizen.id, type: 'STATUS_CHANGED', title: 'Report BA-2026-00147 is in progress', body: 'Ravi Kumar started work on the illegal dumping at Sector 7.', createdAt: daysAgo(0, 6), read: false },
      { userId: citizen.id, type: 'REPORT_ASSIGNED', title: 'Report BA-2026-00148 assigned', body: 'Ravi Kumar is now handling your report.', createdAt: daysAgo(1, 2), read: false },
      { userId: citizen.id, type: 'ACHIEVEMENT', title: 'Badge unlocked — Recycling Champion', body: 'Classified 25 recyclable items', createdAt: daysAgo(2, 5), read: true },
      { userId: citizen.id, type: 'COLLECTION', title: 'Collection tomorrow in Zone A — Riverside', body: 'Riverside Loop runs 06:00 – 09:30. Keep bins accessible.', createdAt: daysAgo(3, 1), read: true },
      { userId: citizen.id, type: 'POINTS', title: '+25 eco points', body: 'Thanks for classifying a glass jar.', createdAt: daysAgo(4, 3), read: true },
      { userId: worker.id, type: 'REPORT_ASSIGNED', title: 'New assignment BA-2026-00147', body: 'Sector 7 Storm Drain — critical priority.', createdAt: daysAgo(1, 2), read: false },
    ],
  });

  for (const key of ['first-report', 'sorting-hero']) {
    const badge = await prisma.badge.findUniqueOrThrow({ where: { key } });
    await prisma.userBadge.create({ data: { userId: citizen.id, badgeId: badge.id } });
  }

  await prisma.auditLog.createMany({
    data: [
      { actorEmail: 'municipality@binalert.io', action: 'report.assigned', target: 'BA-2026-00147 → Ravi Kumar', createdAt: daysAgo(1, 2) },
      { actorEmail: 'municipality@binalert.io', action: 'report.status_changed', target: 'BA-2026-00146 → RESOLVED', createdAt: daysAgo(2, 4) },
      { actorEmail: 'worker@binalert.io', action: 'bin.collected', target: 'BIN-B05 → normal', createdAt: daysAgo(2, 6) },
      { actorEmail: 'municipality@binalert.io', action: 'bin.escalated', target: 'BIN-A01 → critical', createdAt: daysAgo(3, 1) },
      { actorEmail: 'admin@binalert.io', action: 'user.role_changed', target: 'a.reddy@example.com: citizen → worker', createdAt: daysAgo(5, 3) },
      { actorEmail: 'admin@binalert.io', action: 'category.disabled', target: 'Other', createdAt: daysAgo(8, 2) },
      { actorEmail: 'municipality@binalert.io', action: 'route.optimized', target: 'Riverside Loop — 11.4 km → 8.9 km', createdAt: daysAgo(9, 5) },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    bins: await prisma.bin.count(),
    reports: await prisma.wasteReport.count(),
    classifications: await prisma.wasteClassification.count(),
    routes: await prisma.collectionRoute.count(),
    runs: await prisma.collectionRun.count(),
  };

  console.log('\n[seed] Done.');
  console.table(counts);
  console.log(`\n[seed] Sign in with any of these accounts (password: ${env.SEED_PASSWORD})`);
  console.log('       citizen@binalert.io      — citizen');
  console.log('       worker@binalert.io       — collection worker');
  console.log('       municipality@binalert.io — municipality admin');
  console.log('       admin@binalert.io        — system admin\n');
}

function levelFor(points: number): number {
  const ladder = [0, 400, 800, 1200, 1600, 2000, 2800, 3600, 4400, 5600];
  let level = 1;
  ladder.forEach((min, i) => {
    if (points >= min) level = i + 1;
  });
  return level;
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
