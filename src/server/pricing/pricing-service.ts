import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { assertAdminAccess } from "@/server/admin/policy";
import { DefaultPickupRequiredError } from "@/server/deliveries/errors";
import type { DistanceProvider } from "@/server/routing/distance-provider";

import { deliveryQuoteSchema, pricingRuleSchema } from "./schemas";
import type {
  DeliveryQuote,
  PricingActor,
  PricingRepository,
  PricingRuleRecord,
  PricingRuleView,
} from "./types";

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const roundDistance = (value: number) => Math.round(value * 100) / 100;

export function calculateSuggestedPrice(
  rule: Pick<PricingRuleRecord, "basePrice" | "pricePerKm" | "minimumPrice">,
  distanceKm: number,
) {
  return roundCurrency(
    Math.max(rule.minimumPrice, rule.basePrice + rule.pricePerKm * distanceKm),
  );
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
