CREATE TYPE "SubscriptionProvider" AS ENUM ('MERCADO_PAGO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

ALTER TYPE "AdminActionType" ADD VALUE 'SUBSCRIPTION_PLAN_CHANGED';

CREATE TABLE "subscription_plans" (
  "id" UUID NOT NULL,
  "role" "Role" NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "description" VARCHAR(240) NOT NULL,
  "monthlyPrice" DECIMAL(10,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "trialDays" SMALLINT NOT NULL DEFAULT 0,
  "externalPlanId" VARCHAR(120),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_plans_price_check" CHECK ("monthlyPrice" >= 0),
  CONSTRAINT "subscription_plans_trial_check" CHECK ("trialDays" BETWEEN 0 AND 365),
  CONSTRAINT "subscription_plans_role_check" CHECK ("role" IN ('MOTOBOY', 'COMPANY'))
);

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL DEFAULT 'MERCADO_PAGO',
  "providerSubscriptionId" VARCHAR(120),
  "providerStatus" VARCHAR(40),
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "monthlyPrice" DECIMAL(10,2) NOT NULL,
  "checkoutUrl" TEXT,
  "currentPeriodStart" TIMESTAMPTZ(3),
  "currentPeriodEnd" TIMESTAMPTZ(3),
  "nextPaymentAt" TIMESTAMPTZ(3),
  "canceledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_price_check" CHECK ("monthlyPrice" >= 0)
);

CREATE TABLE "subscription_events" (
  "id" UUID NOT NULL,
  "subscriptionId" UUID,
  "providerEventId" VARCHAR(180) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "payloadMetadata" JSONB,
  "processedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_role_key" ON "subscription_plans"("role");
CREATE UNIQUE INDEX "subscription_plans_external_plan_id_key" ON "subscription_plans"("externalPlanId");
CREATE INDEX "subscription_plans_active_role_idx" ON "subscription_plans"("active", "role");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("providerSubscriptionId");
CREATE INDEX "subscriptions_user_status_created_at_idx" ON "subscriptions"("userId", "status", "createdAt");
CREATE INDEX "subscriptions_status_next_payment_at_idx" ON "subscriptions"("status", "nextPaymentAt");
CREATE UNIQUE INDEX "subscriptions_one_open_per_user_key" ON "subscriptions"("userId")
  WHERE "status" IN ('TRIAL', 'PENDING', 'ACTIVE', 'PAST_DUE');
CREATE UNIQUE INDEX "subscription_events_provider_event_id_key" ON "subscription_events"("providerEventId");
CREATE INDEX "subscription_events_subscription_created_at_idx" ON "subscription_events"("subscriptionId", "createdAt");
CREATE INDEX "subscription_events_type_created_at_idx" ON "subscription_events"("eventType", "createdAt");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey"
  FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "subscription_plans" (
  "id", "role", "name", "description", "monthlyPrice", "active", "trialDays", "createdAt", "updatedAt"
) VALUES
  ('15000000-0000-4000-8000-000000000001', 'MOTOBOY', 'Motoboy', 'Acesso às oportunidades e organização do histórico.', 20.00, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('15000000-0000-4000-8000-000000000002', 'COMPANY', 'Empresa', 'Publicação e acompanhamento organizado das entregas locais.', 25.00, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
