import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import {
  DeliveryNotFoundError,
  MotoboyPresenceRequiredError,
} from "@/server/deliveries/errors";
import { deliveryIdSchema } from "@/server/deliveries/schemas";
import type {
  DeliveryActor,
  MotoboyDeliveryContext,
} from "@/server/deliveries/types";
import { isMotoboyEffectivelyOnline } from "@/server/presence/presence-service";

import type { DistanceProvider, OpportunityRouteEstimateView } from "./types";

export interface OpportunityRouteContext {
  motoboy: MotoboyDeliveryContext;
  delivery: {
    id: string;
    pickupLatitude: number;
    pickupLongitude: number;
  };
}

export interface OpportunityRouteRepository {
  getContext(
    userId: string,
    deliveryId: string,
    now: Date,
  ): Promise<OpportunityRouteContext | null>;
}

export async function estimateRouteToOpportunity(
  actor: DeliveryActor | null,
  rawDeliveryId: unknown,
  repository: OpportunityRouteRepository,
  provider: DistanceProvider,
  now: Date,
  presenceTtlMinutes: number,
): Promise<OpportunityRouteEstimateView> {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "MOTOBOY") throw new ForbiddenError();

  const deliveryId = deliveryIdSchema.parse(rawDeliveryId);
  const context = await repository.getContext(actor.userId, deliveryId, now);
  if (!context) throw new DeliveryNotFoundError();
  const { motoboy, delivery } = context;
  if (
    !isMotoboyEffectivelyOnline(motoboy, now, presenceTtlMinutes) ||
    motoboy.lastLatitude === null ||
    motoboy.lastLongitude === null
  ) {
    throw new MotoboyPresenceRequiredError();
  }

  const estimate = await provider.estimate(
    {
      latitude: motoboy.lastLatitude,
      longitude: motoboy.lastLongitude,
    },
    {
      latitude: delivery.pickupLatitude,
      longitude: delivery.pickupLongitude,
    },
    {
      routeType: "courier_to_pickup",
      cacheNamespace: `${motoboy.id}:${delivery.id}`,
    },
  );

  return {
    distanceKm: Math.round(estimate.distanceKm * 100) / 100,
    durationSeconds: estimate.durationSeconds,
    method: estimate.method,
    isRoadDistance: estimate.isRoadDistance,
  };
}
