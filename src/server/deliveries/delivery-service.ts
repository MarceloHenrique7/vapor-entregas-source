import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  calculateStraightLineDistance,
} from "@/lib/maps/geo";
import { isMotoboyEffectivelyOnline } from "@/server/presence/presence-service";
import { buildDeliveryQuote } from "@/server/pricing/pricing-service";
import type { PricingRuleRecord } from "@/server/pricing/types";
import {
  getDistanceProvider,
  type DistanceProvider,
} from "@/server/routing/distance-provider";

import {
  CompanyProfileRequiredError,
  DefaultPickupRequiredError,
  DeliveryAccessDeniedError,
  DeliveryExtrasAcknowledgementRequiredError,
  DeliveryNotFoundError,
  DeliveryTransitionConflictError,
  DeliveryUnavailableError,
  InvalidDeliveryTransitionError,
  MotoboyPresenceRequiredError,
} from "./errors";
import {
  createDeliverySchema,
  acceptDeliverySchema,
  cancelDeliverySchema,
  deliveryHistoryFilterSchema,
  deliveryIdSchema,
  transitionDeliverySchema,
  type CreateDeliveryInput,
} from "./schemas";
import type {
  CompanyPickupContext,
  DeliveryActor,
  DeliveryRecord,
  DeliveryStatus,
  DeliveryView,
  MotoboyDeliveryContext,
} from "./types";

export type AcceptanceResult =
  | { kind: "accepted"; delivery: DeliveryRecord }
  | { kind: "offline" }
  | { kind: "extras_acknowledgement_required" }
  | { kind: "unavailable" };

export type DeliveryMutationResult =
  | { kind: "updated"; delivery: DeliveryRecord }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "conflict" };

const EXPECTED_PREVIOUS_STATUS: Record<
  | "MOTOBOY_TO_PICKUP"
  | "ARRIVED_AT_PICKUP"
  | "PICKED_UP"
  | "IN_DELIVERY"
  | "COMPLETED",
  DeliveryStatus
> = {
  MOTOBOY_TO_PICKUP: "ACCEPTED",
  ARRIVED_AT_PICKUP: "MOTOBOY_TO_PICKUP",
  PICKED_UP: "ARRIVED_AT_PICKUP",
  IN_DELIVERY: "PICKED_UP",
  COMPLETED: "IN_DELIVERY",
};

const COMPANY_CANCELLABLE_STATUSES: DeliveryStatus[] = [
  "SEARCHING_MOTOBOY",
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];
const MOTOBOY_CANCELLABLE_STATUSES: DeliveryStatus[] = [
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];

export interface DeliveryRepository {
  getCompanyPickup(userId: string): Promise<CompanyPickupContext | null>;
  createDelivery(
    actorUserId: string,
    pickup: CompanyPickupContext,
    input: CreateDeliveryInput,
    pricing: {
      distanceEstimateKm: number;
      distanceMethod: "STRAIGHT_LINE";
      suggestedPrice: number | null;
      pricingRuleId: string | null;
    },
    expiresAt: Date,
  ): Promise<DeliveryRecord>;
  getActiveRule(
    city: CompanyPickupContext["city"],
    now: Date,
  ): Promise<PricingRuleRecord | null>;
  listCompanyDeliveries(userId: string): Promise<DeliveryRecord[] | null>;
  getMotoboyContext(userId: string): Promise<MotoboyDeliveryContext | null>;
  listOpenDeliveries(
    city: MotoboyDeliveryContext["city"],
    now: Date,
  ): Promise<DeliveryRecord[]>;
  acceptDeliveryAtomically(
    userId: string,
    deliveryId: string,
    now: Date,
    presenceCutoff: Date,
    radiusKm: number,
    extrasAcknowledged: boolean,
  ): Promise<AcceptanceResult>;
  getCurrentDeliveryForMotoboy(userId: string): Promise<DeliveryRecord | null>;
  getDeliveryForActor(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    deliveryId: string,
  ): Promise<DeliveryRecord | null | "forbidden">;
  transitionDeliveryAtomically(
    userId: string,
    deliveryId: string,
    expectedStatus: DeliveryStatus,
    newStatus: DeliveryStatus,
    note: string | undefined,
    now: Date,
  ): Promise<DeliveryMutationResult>;
  cancelDeliveryAtomically(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    deliveryId: string,
    allowedStatuses: DeliveryStatus[],
    newStatus: "CANCELLED_BY_COMPANY" | "CANCELLED_BY_MOTOBOY",
    reason: string | undefined,
    now: Date,
  ): Promise<DeliveryMutationResult>;
  listDeliveryHistory(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    filters: { status?: DeliveryStatus; from?: string; to?: string },
  ): Promise<DeliveryRecord[] | null>;
}

function toPublicDelivery(
  delivery: DeliveryRecord,
  includeNavigation = false,
): DeliveryView {
  const publicDelivery = { ...delivery } as Record<string, unknown>;
  delete publicDelivery.pickupLatitude;
  delete publicDelivery.pickupLongitude;
  delete publicDelivery.destinationLatitude;
  delete publicDelivery.destinationLongitude;
  return {
    ...(publicDelivery as unknown as DeliveryView),
    ...(includeNavigation
      ? {
          pickupNavigation: {
            googleMaps: buildGoogleMapsUrl(
              delivery.pickupLatitude,
              delivery.pickupLongitude,
            ),
            waze: buildWazeUrl(
              delivery.pickupLatitude,
              delivery.pickupLongitude,
            ),
          },
          destinationNavigation: {
            googleMaps: buildGoogleMapsUrl(
              delivery.destinationLatitude,
              delivery.destinationLongitude,
            ),
            waze: buildWazeUrl(
              delivery.destinationLatitude,
              delivery.destinationLongitude,
            ),
          },
        }
      : {}),
  };
}

function requireActor(
  actor: DeliveryActor | null,
  role: "COMPANY" | "MOTOBOY",
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== role) throw new ForbiddenError();
  return actor;
}

export async function createDelivery(
  actor: DeliveryActor | null,
  input: unknown,
  repository: DeliveryRepository,
  now: Date,
  opportunityTtlMinutes: number,
  distanceProvider: DistanceProvider = getDistanceProvider(),
) {
  const company = requireActor(actor, "COMPANY");
  const validated = createDeliverySchema.parse(input);
  const pickup = await repository.getCompanyPickup(company.userId);
  if (!pickup) throw new DefaultPickupRequiredError();
  const pricing = await buildDeliveryQuote(
    pickup,
    {
      latitude: validated.destinationLatitude,
      longitude: validated.destinationLongitude,
    },
    repository,
    distanceProvider,
    now,
  );
  const expiresAt = new Date(
    now.getTime() + opportunityTtlMinutes * 60 * 1_000,
  );
  const delivery = await repository.createDelivery(
    company.userId,
    pickup,
    validated,
    pricing,
    expiresAt,
  );
  return toPublicDelivery(delivery);
}

export async function listCompanyDeliveries(
  actor: DeliveryActor | null,
  repository: DeliveryRepository,
) {
  const company = requireActor(actor, "COMPANY");
  const deliveries = await repository.listCompanyDeliveries(company.userId);
  if (!deliveries) throw new CompanyProfileRequiredError();
  return deliveries.map((delivery) => toPublicDelivery(delivery));
}

export async function listMotoboyOpportunities(
  actor: DeliveryActor | null,
  repository: DeliveryRepository,
  now: Date,
  presenceTtlMinutes: number,
  radiusKm: number,
): Promise<DeliveryView[]> {
  const actorMotoboy = requireActor(actor, "MOTOBOY");
  const motoboy = await repository.getMotoboyContext(actorMotoboy.userId);
  if (
    !motoboy ||
    !isMotoboyEffectivelyOnline(motoboy, now, presenceTtlMinutes) ||
    motoboy.lastLatitude === null ||
    motoboy.lastLongitude === null
  ) {
    throw new MotoboyPresenceRequiredError();
  }
  const deliveries = await repository.listOpenDeliveries(motoboy.city, now);
  return deliveries
    .map((delivery) => ({
      ...delivery,
      distanceToPickupKm:
        Math.round(
          calculateStraightLineDistance(
            {
              latitude: motoboy.lastLatitude!,
              longitude: motoboy.lastLongitude!,
            },
            {
              latitude: delivery.pickupLatitude,
              longitude: delivery.pickupLongitude,
            },
          ) * 100,
        ) / 100,
    }))
    .filter((delivery) => delivery.distanceToPickupKm <= radiusKm)
    .map((delivery) => toPublicDelivery(delivery));
}

export async function acceptDelivery(
  actor: DeliveryActor | null,
  rawDeliveryId: unknown,
  repository: DeliveryRepository,
  now: Date,
  presenceTtlMinutes: number,
  radiusKm: number,
  input: unknown = {},
) {
  const motoboy = requireActor(actor, "MOTOBOY");
  const deliveryId = deliveryIdSchema.parse(rawDeliveryId);
  const { extrasAcknowledged } = acceptDeliverySchema.parse(input);
  const result = await repository.acceptDeliveryAtomically(
    motoboy.userId,
    deliveryId,
    now,
    new Date(now.getTime() - presenceTtlMinutes * 60 * 1_000),
    radiusKm,
    extrasAcknowledged,
  );
  if (result.kind === "offline") throw new MotoboyPresenceRequiredError();
  if (result.kind === "extras_acknowledgement_required") {
    throw new DeliveryExtrasAcknowledgementRequiredError();
  }
  if (result.kind === "unavailable") throw new DeliveryUnavailableError();
  return toPublicDelivery(result.delivery, true);
}

export async function getCurrentMotoboyDelivery(
  actor: DeliveryActor | null,
  repository: DeliveryRepository,
) {
  const motoboy = requireActor(actor, "MOTOBOY");
  const delivery = await repository.getCurrentDeliveryForMotoboy(
    motoboy.userId,
  );
  return delivery ? toPublicDelivery(delivery, true) : null;
}

function resolveMutationResult(result: DeliveryMutationResult) {
  if (result.kind === "not_found") throw new DeliveryNotFoundError();
  if (result.kind === "forbidden") throw new DeliveryAccessDeniedError();
  if (result.kind === "conflict") throw new DeliveryTransitionConflictError();
  return toPublicDelivery(result.delivery, true);
}

export async function getDeliveryDetails(
  actor: DeliveryActor | null,
  rawDeliveryId: unknown,
  repository: DeliveryRepository,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  const deliveryId = deliveryIdSchema.parse(rawDeliveryId);
  const delivery = await repository.getDeliveryForActor(
    actor.userId,
    actor.role,
    deliveryId,
  );
  if (delivery === "forbidden") throw new DeliveryAccessDeniedError();
  if (!delivery) throw new DeliveryNotFoundError();
  return toPublicDelivery(delivery, true);
}

export async function advanceDeliveryStatus(
  actor: DeliveryActor | null,
  rawDeliveryId: unknown,
  input: unknown,
  repository: DeliveryRepository,
  now: Date,
) {
  const motoboy = requireActor(actor, "MOTOBOY");
  const deliveryId = deliveryIdSchema.parse(rawDeliveryId);
  const validated = transitionDeliverySchema.parse(input);
  const expectedStatus = EXPECTED_PREVIOUS_STATUS[validated.status];
  if (!expectedStatus) throw new InvalidDeliveryTransitionError();
  return resolveMutationResult(
    await repository.transitionDeliveryAtomically(
      motoboy.userId,
      deliveryId,
      expectedStatus,
      validated.status,
      validated.note,
      now,
    ),
  );
}

export async function cancelDelivery(
  actor: DeliveryActor | null,
  rawDeliveryId: unknown,
  input: unknown,
  repository: DeliveryRepository,
  now: Date,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  const deliveryId = deliveryIdSchema.parse(rawDeliveryId);
  const { reason } = cancelDeliverySchema.parse(input);
  const isCompany = actor.role === "COMPANY";
  return resolveMutationResult(
    await repository.cancelDeliveryAtomically(
      actor.userId,
      actor.role,
      deliveryId,
      isCompany ? COMPANY_CANCELLABLE_STATUSES : MOTOBOY_CANCELLABLE_STATUSES,
      isCompany ? "CANCELLED_BY_COMPANY" : "CANCELLED_BY_MOTOBOY",
      reason,
      now,
    ),
  );
}

export async function listActorDeliveryHistory(
  actor: DeliveryActor | null,
  input: unknown,
  repository: DeliveryRepository,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  const filters = deliveryHistoryFilterSchema.parse(input);
  const deliveries = await repository.listDeliveryHistory(
    actor.userId,
    actor.role,
    filters,
  );
  if (!deliveries) {
    if (actor.role === "COMPANY") throw new CompanyProfileRequiredError();
    throw new DeliveryAccessDeniedError();
  }
  return deliveries.map((delivery) => toPublicDelivery(delivery));
}
