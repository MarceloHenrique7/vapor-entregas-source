-- AddColumns
ALTER TABLE "motoboy_profiles"
ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onlineSince" TIMESTAMPTZ(3),
ADD COLUMN "lastLocationAt" TIMESTAMPTZ(3),
ADD COLUMN "lastLatitude" DECIMAL(9,6),
ADD COLUMN "lastLongitude" DECIMAL(9,6);

-- Keep coordinate pairs consistent and inside valid geographic ranges.
ALTER TABLE "motoboy_profiles"
ADD CONSTRAINT "motoboy_profiles_location_pair_check" CHECK (
  ("lastLocationAt" IS NULL AND "lastLatitude" IS NULL AND "lastLongitude" IS NULL) OR
  ("lastLocationAt" IS NOT NULL AND "lastLatitude" IS NOT NULL AND "lastLongitude" IS NOT NULL)
),
ADD CONSTRAINT "motoboy_profiles_latitude_check" CHECK (
  "lastLatitude" IS NULL OR "lastLatitude" BETWEEN -90 AND 90
),
ADD CONSTRAINT "motoboy_profiles_longitude_check" CHECK (
  "lastLongitude" IS NULL OR "lastLongitude" BETWEEN -180 AND 180
),
ADD CONSTRAINT "motoboy_profiles_online_since_check" CHECK (
  "isOnline" = false OR ("onlineSince" IS NOT NULL AND "lastLocationAt" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "motoboy_profiles_isOnline_lastLocationAt_idx"
ON "motoboy_profiles"("isOnline", "lastLocationAt");
