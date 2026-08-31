-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM (
  'SEARCHING_MOTOBOY',
  'ACCEPTED',
  'MOTOBOY_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_DELIVERY',
  'COMPLETED',
  'CANCELLED_BY_COMPANY',
  'CANCELLED_BY_MOTOBOY',
  'EXPIRED',
  'DISPUTED'
);

CREATE TYPE "DeliveryPaymentMethod" AS ENUM (
  'PIX',
  'CASH',
  'COMPANY_SETTLEMENT',
  'OTHER'
);

-- CreateTable
CREATE TABLE "deliveries" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "motoboyId" UUID,
  "pickupLocationId" UUID NOT NULL,
  "pickupLabel" VARCHAR(80) NOT NULL,
  "pickupAddress" VARCHAR(180) NOT NULL,
  "pickupNumber" VARCHAR(20) NOT NULL,
  "pickupNeighborhood" VARCHAR(100) NOT NULL,
  "pickupCity" "SupportedCity" NOT NULL,
  "pickupState" CHAR(2) NOT NULL,
  "pickupLatitude" DECIMAL(9,6) NOT NULL,
  "pickupLongitude" DECIMAL(9,6) NOT NULL,
  "destinationAddress" VARCHAR(180) NOT NULL,
  "destinationNumber" VARCHAR(20) NOT NULL,
  "destinationNeighborhood" VARCHAR(100) NOT NULL,
  "destinationComplement" VARCHAR(120),
  "destinationReference" VARCHAR(180),
  "destinationCity" "SupportedCity" NOT NULL,
  "destinationState" CHAR(2) NOT NULL,
  "destinationPostalCode" VARCHAR(9),
  "destinationLatitude" DECIMAL(9,6) NOT NULL,
  "destinationLongitude" DECIMAL(9,6) NOT NULL,
  "distanceEstimateKm" DECIMAL(8,2) NOT NULL,
  "offeredPrice" DECIMAL(10,2) NOT NULL,
  "paymentMethod" "DeliveryPaymentMethod" NOT NULL,
  "notes" VARCHAR(500),
  "status" "DeliveryStatus" NOT NULL DEFAULT 'SEARCHING_MOTOBOY',
  "acceptedAt" TIMESTAMPTZ(3),
  "pickedUpAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deliveries_pickup_latitude_check" CHECK ("pickupLatitude" BETWEEN -90 AND 90),
  CONSTRAINT "deliveries_pickup_longitude_check" CHECK ("pickupLongitude" BETWEEN -180 AND 180),
  CONSTRAINT "deliveries_destination_latitude_check" CHECK ("destinationLatitude" BETWEEN -90 AND 90),
  CONSTRAINT "deliveries_destination_longitude_check" CHECK ("destinationLongitude" BETWEEN -180 AND 180),
  CONSTRAINT "deliveries_offered_price_check" CHECK ("offeredPrice" > 0),
  CONSTRAINT "deliveries_distance_check" CHECK ("distanceEstimateKm" >= 0),
  CONSTRAINT "deliveries_acceptance_check" CHECK (
    ("status" = 'SEARCHING_MOTOBOY' AND "motoboyId" IS NULL AND "acceptedAt" IS NULL) OR
    ("status" <> 'SEARCHING_MOTOBOY')
  )
);

CREATE TABLE "delivery_status_history" (
  "id" UUID NOT NULL,
  "deliveryId" UUID NOT NULL,
  "status" "DeliveryStatus" NOT NULL,
  "actorUserId" UUID,
  "note" VARCHAR(300),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliveries_companyId_createdAt_idx" ON "deliveries"("companyId", "createdAt");
CREATE INDEX "deliveries_motoboyId_status_idx" ON "deliveries"("motoboyId", "status");
CREATE INDEX "deliveries_status_createdAt_idx" ON "deliveries"("status", "createdAt");
CREATE INDEX "deliveries_pickupCity_status_idx" ON "deliveries"("pickupCity", "status");
CREATE UNIQUE INDEX "deliveries_one_active_per_motoboy_idx"
ON "deliveries"("motoboyId")
WHERE "motoboyId" IS NOT NULL AND "status" IN (
  'ACCEPTED', 'MOTOBOY_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_DELIVERY'
);
CREATE INDEX "delivery_status_history_deliveryId_createdAt_idx" ON "delivery_status_history"("deliveryId", "createdAt");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_motoboyId_fkey"
FOREIGN KEY ("motoboyId") REFERENCES "motoboy_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_pickupLocationId_fkey"
FOREIGN KEY ("pickupLocationId") REFERENCES "company_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_deliveryId_fkey"
FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
