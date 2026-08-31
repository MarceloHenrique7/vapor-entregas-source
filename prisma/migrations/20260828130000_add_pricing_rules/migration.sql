CREATE TYPE "DistanceCalculationMethod" AS ENUM ('STRAIGHT_LINE');

ALTER TYPE "AdminActionType" ADD VALUE 'PRICING_RULE_CHANGED';

CREATE TABLE "pricing_rules" (
  "id" UUID NOT NULL,
  "city" "SupportedCity" NOT NULL,
  "basePrice" DECIMAL(10,2) NOT NULL,
  "pricePerKm" DECIMAL(10,2) NOT NULL,
  "minimumPrice" DECIMAL(10,2) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "activeFrom" TIMESTAMPTZ(3) NOT NULL,
  "activeTo" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_rules_non_negative_check"
    CHECK ("basePrice" >= 0 AND "pricePerKm" >= 0 AND "minimumPrice" >= 0),
  CONSTRAINT "pricing_rules_period_check"
    CHECK ("activeTo" IS NULL OR "activeTo" > "activeFrom")
);

ALTER TABLE "deliveries"
  ADD COLUMN "distanceMethod" "DistanceCalculationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
  ADD COLUMN "suggestedPrice" DECIMAL(10,2),
  ADD COLUMN "pricingRuleId" UUID;

CREATE INDEX "pricing_rules_city_enabled_active_from_idx"
  ON "pricing_rules"("city", "enabled", "activeFrom");
CREATE INDEX "deliveries_pricing_rule_id_idx"
  ON "deliveries"("pricingRuleId");

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_pricing_rule_id_fkey"
  FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Valores exclusivamente provisórios e editáveis pelo painel administrativo.
INSERT INTO "pricing_rules" (
  "id", "city", "basePrice", "pricePerKm", "minimumPrice",
  "enabled", "activeFrom", "createdAt", "updatedAt"
) VALUES
  ('14000000-0000-4000-8000-000000000001', 'PETROLINA_PE', 8.00, 2.00, 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('14000000-0000-4000-8000-000000000002', 'JUAZEIRO_BA', 8.00, 2.00, 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
