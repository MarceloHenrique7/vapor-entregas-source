import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { assertAdminAccess } from "@/server/admin/policy";
import {
  DefaultPickupRequiredError,
  PricingRuleUnavailableError,
} from "@/server/deliveries/errors";
import type { DistanceProvider } from "@/server/routing/distance-provider";

import {
  deliveryQuoteSchema,
  manualFreightQuoteSchema,
  pricingRuleSchema,
} from "./schemas";
import type {
  DeliveryQuote,
  PricingActor,
  PricingRepository,
  PricingRuleRecord,
  PricingRuleView,
  ManualFreightQuote,
} from "./types";

const roundDistance = (value: number) => Math.round(value * 100) / 100;

export function calculateSuggestedPrice(
  rule: Pick<PricingRuleRecord, "basePrice" | "pricePerKm" | "minimumPrice">,
  distanceKm: number,
) {
  return calculateSuggestedPriceCents(rule, distanceKm) / 100;
}

const toCents = (value: number) => Math.round(value * 100);

export function calculateSuggestedPriceCents(
  rule: Pick<PricingRuleRecord, "basePrice" | "pricePerKm" | "minimumPrice">,
  distanceKm: number,
) {
  const basePriceCents = toCents(rule.basePrice);
  const minimumPriceCents = toCents(rule.minimumPrice);
  const distancePriceCents = Math.round(toCents(rule.pricePerKm) * distanceKm);
  return Math.max(minimumPriceCents, basePriceCents + distancePriceCents);
}

export function toPricingRuleView(rule: PricingRuleRecord): PricingRuleView {
  return {
    ...rule,
    activeFrom: rule.activeFrom.toISOString(),
    activeTo: rule.activeTo?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
  };
}

export async function buildDeliveryQuote(
  pickup: {
    latitude: number;
    longitude: number;
    city: "PETROLINA_PE" | "JUAZEIRO_BA";
  },
  destination: { latitude: number; longitude: number },
  repository: Pick<PricingRepository, "getActiveRule">,
  distanceProvider: DistanceProvider,
  now: Date,
): Promise<DeliveryQuote> {
  const estimate = await distanceProvider.estimate(pickup, destination, {
    routeType: "pickup_to_dropoff",
  });
  const distanceEstimateKm = roundDistance(estimate.distanceKm);
  const rule = await repository.getActiveRule(pickup.city, now);
  return {
    distanceEstimateKm,
    distanceMethod: estimate.method,
    routeDurationSeconds: estimate.durationSeconds ?? null,
    routeCalculatedAt: now,
    distanceLabel: estimate.isRoadDistance
      ? "Estimativa pela rota viária mais adequada no momento."
      : "Estimativa em linha reta; não representa distância viária.",
    suggestedPrice: rule
      ? calculateSuggestedPrice(rule, distanceEstimateKm)
      : null,
    pricingRuleId: rule?.id ?? null,
  };
}

export async function quoteDelivery(
  actor: PricingActor | null,
  input: unknown,
  repository: PricingRepository,
  distanceProvider: DistanceProvider,
  now: Date,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const validated = deliveryQuoteSchema.parse(input);
  const pickup = await repository.getCompanyPickup(actor.userId);
  if (!pickup) throw new DefaultPickupRequiredError();
  return buildDeliveryQuote(
    pickup,
    {
      latitude: validated.destinationLatitude,
      longitude: validated.destinationLongitude,
    },
    repository,
    distanceProvider,
    now,
  );
}

export async function quoteManualFreight(
  actor: PricingActor | null,
  input: unknown,
  repository: Pick<PricingRepository, "getCompanyPickup" | "getActiveRule">,
  now: Date,
): Promise<ManualFreightQuote> {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const validated = manualFreightQuoteSchema.parse(input);
  const pickup = await repository.getCompanyPickup(actor.userId);
  if (!pickup) throw new DefaultPickupRequiredError();
  const rule = await repository.getActiveRule(pickup.city, now);
  if (!rule) {
    throw new PricingRuleUnavailableError();
  }
  const basePriceCents = toCents(rule.basePrice);
  const minimumPriceCents = toCents(rule.minimumPrice);
  const distancePriceCents = Math.round(
    toCents(rule.pricePerKm) * validated.distanceKm,
  );
  const suggestedPriceCents = calculateSuggestedPriceCents(
    rule,
    validated.distanceKm,
  );
  return {
    city: pickup.city,
    distanceKm: Math.round(validated.distanceKm * 100) / 100,
    distanceMethod: "MANUAL",
    basePriceCents,
    distancePriceCents,
    minimumPriceCents,
    additionalCents: validated.additionalCents,
    suggestedPriceCents,
    totalEstimateCents: suggestedPriceCents + validated.additionalCents,
    pricingRuleId: rule.id,
    pricingRuleActiveFrom: rule.activeFrom.toISOString(),
    notice:
      "Estimativa calculada com a distância informada manualmente. O valor da corrida continua sujeito ao acordo direto entre empresa e motoboy.",
  };
}

export async function listPricingRules(
  actor: PricingActor | null,
  repository: PricingRepository,
) {
  assertAdminAccess(actor ?? null);
  return (await repository.listRules()).map(toPricingRuleView);
}

export async function replacePricingRule(
  actor: PricingActor | null,
  input: unknown,
  repository: PricingRepository,
  now: Date,
) {
  assertAdminAccess(actor ?? null);
  const validated = pricingRuleSchema.parse(input);
  return toPricingRuleView(
    await repository.replaceActiveRule(actor!.userId, validated, now),
  );
}
