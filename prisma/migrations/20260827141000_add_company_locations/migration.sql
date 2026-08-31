-- CreateTable
CREATE TABLE "company_locations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL DEFAULT 'Loja principal',
    "address" VARCHAR(180) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "complement" VARCHAR(120),
    "reference" VARCHAR(180),
    "city" "SupportedCity" NOT NULL,
    "state" CHAR(2) NOT NULL,
    "postalCode" VARCHAR(9),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_locations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_locations_state_check" CHECK ("state" IN ('PE', 'BA')),
    CONSTRAINT "company_locations_city_state_check" CHECK (
        ("city" = 'PETROLINA_PE' AND "state" = 'PE') OR
        ("city" = 'JUAZEIRO_BA' AND "state" = 'BA')
    ),
    CONSTRAINT "company_locations_latitude_check" CHECK ("latitude" IS NULL OR ("latitude" BETWEEN -90 AND 90)),
    CONSTRAINT "company_locations_longitude_check" CHECK ("longitude" IS NULL OR ("longitude" BETWEEN -180 AND 180))
);

-- Preserve textual addresses from existing company profiles as unconfirmed locations.
INSERT INTO "company_locations" (
    "id", "companyId", "label", "address", "number", "neighborhood",
    "complement", "reference", "city", "state", "isDefault",
    "createdAt", "updatedAt"
)
SELECT
    md5("id"::text || ':main-location')::uuid,
    "id",
    'Loja principal',
    "address",
    "addressNumber",
    "neighborhood",
    "complement",
    "referencePoint",
    "city",
    CASE WHEN "city" = 'PETROLINA_PE' THEN 'PE' ELSE 'BA' END,
    false,
    "createdAt",
    CURRENT_TIMESTAMP
FROM "company_profiles";

-- Remove duplicated address fields from the profile.
ALTER TABLE "company_profiles"
DROP COLUMN "address",
DROP COLUMN "addressNumber",
DROP COLUMN "neighborhood",
DROP COLUMN "complement",
DROP COLUMN "referencePoint";

-- CreateIndex
CREATE INDEX "company_locations_companyId_idx" ON "company_locations"("companyId");
CREATE INDEX "company_locations_companyId_isDefault_idx" ON "company_locations"("companyId", "isDefault");
CREATE UNIQUE INDEX "company_locations_one_default_per_company_idx"
ON "company_locations"("companyId") WHERE "isDefault" = true;

-- AddForeignKey
ALTER TABLE "company_locations" ADD CONSTRAINT "company_locations_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
