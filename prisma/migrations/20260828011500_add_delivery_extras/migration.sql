CREATE TYPE "DeliveryExtraType" AS ENUM ('WAITING', 'RETURN', 'PURCHASE', 'SPECIAL_WEIGHT_VOLUME', 'OTHER');
CREATE TYPE "DeliveryExtraStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED');
CREATE TYPE "DeliveryExtraAction" AS ENUM ('CREATED', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED');

CREATE TABLE "delivery_extras" (
  "id" UUID NOT NULL,
  "deliveryId" UUID NOT NULL,
  "type" "DeliveryExtraType" NOT NULL,
  "description" VARCHAR(240) NOT NULL,
  "amount" DECIMAL(10,2),
  "informedByUserId" UUID NOT NULL,
  "informedByRole" "Role" NOT NULL,
  "status" "DeliveryExtraStatus" NOT NULL DEFAULT 'PENDING',
  "note" VARCHAR(300),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "delivery_extras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_extra_history" (
  "id" UUID NOT NULL,
  "extraId" UUID NOT NULL,
  "previousStatus" "DeliveryExtraStatus",
  "newStatus" "DeliveryExtraStatus" NOT NULL,
  "action" "DeliveryExtraAction" NOT NULL,
  "actorUserId" UUID NOT NULL,
  "actorRole" "Role" NOT NULL,
  "note" VARCHAR(300),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_extra_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_extras_delivery_id_status_created_at_idx" ON "delivery_extras"("deliveryId", "status", "createdAt");
CREATE INDEX "delivery_extras_informed_by_user_id_created_at_idx" ON "delivery_extras"("informedByUserId", "createdAt");
CREATE INDEX "delivery_extra_history_extra_id_created_at_idx" ON "delivery_extra_history"("extraId", "createdAt");
CREATE INDEX "delivery_extra_history_actor_user_id_created_at_idx" ON "delivery_extra_history"("actorUserId", "createdAt");

ALTER TABLE "delivery_extras" ADD CONSTRAINT "delivery_extras_delivery_id_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_extras" ADD CONSTRAINT "delivery_extras_informed_by_user_id_fkey" FOREIGN KEY ("informedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_extra_history" ADD CONSTRAINT "delivery_extra_history_extra_id_fkey" FOREIGN KEY ("extraId") REFERENCES "delivery_extras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_extra_history" ADD CONSTRAINT "delivery_extra_history_actor_user_id_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
