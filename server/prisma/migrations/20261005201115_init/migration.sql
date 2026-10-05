-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'WORKER', 'MUNICIPALITY_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('PLASTIC', 'PAPER', 'GLASS', 'METAL', 'ORGANIC', 'E_WASTE', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('OVERFLOWING_BIN', 'ILLEGAL_DUMPING', 'UNCOLLECTED_WASTE', 'ROADSIDE_WASTE', 'MIXED_WASTE', 'HAZARDOUS_WASTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BinStatus" AS ENUM ('NORMAL', 'ATTENTION', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CollectionRunStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPORT_SUBMITTED', 'REPORT_ASSIGNED', 'STATUS_CHANGED', 'RESOLVED', 'COLLECTION', 'ACHIEVEMENT', 'POINTS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "location" TEXT,
    "avatarHue" INTEGER NOT NULL DEFAULT 152,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ecoScore" INTEGER NOT NULL DEFAULT 50,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "municipalityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "status" TEXT NOT NULL DEFAULT 'trial',
    "population" INTEGER NOT NULL DEFAULT 0,
    "recyclingRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_categories" (
    "id" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "recommendedBin" TEXT NOT NULL,
    "binColor" TEXT NOT NULL,
    "environmentalTip" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_classifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryDefId" TEXT,
    "category" "WasteCategory" NOT NULL,
    "itemName" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "recommendedBin" TEXT NOT NULL,
    "binColor" TEXT NOT NULL,
    "environmentalTip" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "co2SavedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'demo',
    "modelId" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternative_predictions" (
    "id" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "alternative_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "imageUrl" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "landmark" TEXT NOT NULL,
    "zoneId" TEXT,
    "userId" TEXT NOT NULL,
    "assignedWorkerId" TEXT,
    "resolutionNotes" TEXT,
    "resolutionImageUrl" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_timeline" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bins" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "zoneId" TEXT,
    "municipalityId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "BinStatus" NOT NULL DEFAULT 'NORMAL',
    "fillLevel" INTEGER NOT NULL DEFAULT 0,
    "accepted" "WasteCategory"[],
    "lastCollectedAt" TIMESTAMP(3),

    CONSTRAINT "bins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_status" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "status" "BinStatus" NOT NULL,
    "fillLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bin_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "driver" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "routeId" TEXT,

    CONSTRAINT "collection_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT,
    "municipalityId" TEXT,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "path" JSONB NOT NULL DEFAULT '[]',
    "optimizedDistanceKm" DOUBLE PRECISION,
    "optimizedDurationMin" INTEGER,
    "fuelSavedL" DOUBLE PRECISION,
    "improvementPct" DOUBLE PRECISION,

    CONSTRAINT "collection_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_runs" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "worker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "window" TEXT NOT NULL,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "status" "CollectionRunStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "collection_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycling_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accepts" TEXT[],
    "throughputKgDay" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recycling_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_results" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'city',
    "horizonDays" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "series" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_municipalityId_idx" ON "users"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_municipalityId_name_key" ON "zones"("municipalityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "waste_categories_category_key" ON "waste_categories"("category");

-- CreateIndex
CREATE INDEX "waste_classifications_userId_createdAt_idx" ON "waste_classifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "waste_classifications_category_idx" ON "waste_classifications"("category");

-- CreateIndex
CREATE INDEX "alternative_predictions_classificationId_idx" ON "alternative_predictions"("classificationId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reference_key" ON "reports"("reference");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_userId_createdAt_idx" ON "reports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reports_zoneId_idx" ON "reports"("zoneId");

-- CreateIndex
CREATE INDEX "report_timeline_reportId_createdAt_idx" ON "report_timeline"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bins_code_key" ON "bins"("code");

-- CreateIndex
CREATE INDEX "bins_zoneId_idx" ON "bins"("zoneId");

-- CreateIndex
CREATE INDEX "bins_status_idx" ON "bins"("status");

-- CreateIndex
CREATE INDEX "bin_status_binId_createdAt_idx" ON "bin_status"("binId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "collection_vehicles_plate_key" ON "collection_vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "collection_runs_reference_key" ON "collection_runs"("reference");

-- CreateIndex
CREATE INDEX "collection_runs_date_idx" ON "collection_runs"("date");

-- CreateIndex
CREATE INDEX "collection_runs_status_idx" ON "collection_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_scope_period_metric_key" ON "analytics"("scope", "period", "metric");

-- CreateIndex
CREATE INDEX "forecast_results_scope_horizonDays_idx" ON "forecast_results"("scope", "horizonDays");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "points_userId_createdAt_idx" ON "points"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_classifications" ADD CONSTRAINT "waste_classifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_classifications" ADD CONSTRAINT "waste_classifications_categoryDefId_fkey" FOREIGN KEY ("categoryDefId") REFERENCES "waste_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternative_predictions" ADD CONSTRAINT "alternative_predictions_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "waste_classifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_timeline" ADD CONSTRAINT "report_timeline_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bins" ADD CONSTRAINT "bins_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bins" ADD CONSTRAINT "bins_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_status" ADD CONSTRAINT "bin_status_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_vehicles" ADD CONSTRAINT "collection_vehicles_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "collection_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_runs" ADD CONSTRAINT "collection_runs_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "collection_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_runs" ADD CONSTRAINT "collection_runs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "collection_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
