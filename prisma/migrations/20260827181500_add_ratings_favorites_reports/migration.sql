CREATE TYPE "ReportCategory" AS ENUM (
  'USER_NO_SHOW', 'FRAUD_ATTEMPT', 'INAPPROPRIATE_BEHAVIOR',
  'PAYMENT_PROBLEM', 'THREAT', 'ACCIDENT', 'IRREGULAR_ORDER', 'OTHER'
);

CREATE TYPE "ReportStatus" AS ENUM (
  'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'
);

CREATE TABLE "ratings" (
  "id" UUID NOT NULL,
  "deliveryId" UUID NOT NULL,
  "reviewerUserId" UUID NOT NULL,
  "reviewedUserId" UUID NOT NULL,
  "reviewerRole" "Role" NOT NULL,
  "score" SMALLINT NOT NULL,
  "comment" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_score_check" CHECK ("score" BETWEEN 1 AND 5),
  CONSTRAINT "ratings_users_check" CHECK ("reviewerUserId" <> "reviewedUserId")
);

CREATE TABLE "favorites" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "motoboyId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
  "id" UUID NOT NULL,
  "reporterUserId" UUID NOT NULL,
  "reportedUserId" UUID,
  "deliveryId" UUID,
  "category" "ReportCategory" NOT NULL,
  "description" VARCHAR(1500) NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_deliveryId_reviewerUserId_key" ON "ratings"("deliveryId", "reviewerUserId");
CREATE INDEX "ratings_reviewedUserId_createdAt_idx" ON "ratings"("reviewedUserId", "createdAt");
CREATE INDEX "ratings_reviewerUserId_createdAt_idx" ON "ratings"("reviewerUserId", "createdAt");
CREATE UNIQUE INDEX "favorites_companyId_motoboyId_key" ON "favorites"("companyId", "motoboyId");
CREATE INDEX "favorites_motoboyId_idx" ON "favorites"("motoboyId");
CREATE UNIQUE INDEX "reports_reporterUserId_fingerprint_key" ON "reports"("reporterUserId", "fingerprint");
CREATE INDEX "reports_reporterUserId_createdAt_idx" ON "reports"("reporterUserId", "createdAt");
CREATE INDEX "reports_reportedUserId_status_idx" ON "reports"("reportedUserId", "status");
CREATE INDEX "reports_deliveryId_idx" ON "reports"("deliveryId");
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewedUserId_fkey" FOREIGN KEY ("reviewedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "motoboy_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
