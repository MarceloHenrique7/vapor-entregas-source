-- ETAPA 11: central interna persistente de notificações.
CREATE TYPE "NotificationType" AS ENUM (
  'NEW_OPPORTUNITY',
  'DELIVERY_ACCEPTED',
  'DELIVERY_STATUS_CHANGED',
  'DELIVERY_CANCELLED',
  'DELIVERY_COMPLETED',
  'REPORT_UPDATED',
  'ADMIN_NOTICE'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "readAt" TIMESTAMPTZ(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_userId_readAt_createdAt_idx"
  ON "notifications"("userId", "readAt", "createdAt");

CREATE INDEX "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

CREATE INDEX "deliveries_pickupCity_status_expiresAt_idx"
  ON "deliveries"("pickupCity", "status", "expiresAt");
