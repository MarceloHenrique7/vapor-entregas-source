import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import {
  decryptPrivateField,
  encryptPrivateField,
} from "@/server/security/private-fields";

import {
  TrackingAccessDeniedError,
  TrackingExpiredError,
  TrackingNotFoundError,
  TrackingRateLimitError,
  TrackingUnavailableError,
} from "./errors";
import {
  trackingDeliveryIdSchema,
  trackingLocationSchema,
  trackingTokenSchema,
} from "./schemas";
import { createTrackingToken, hashTrackingToken } from "./token";
import type {
  PublicTrackingView,
  TrackingActor,
  TrackingDeliveryRecord,
  TrackingLinkView,
  TrackingRecord,
} from "./types";

const LINK_ELIGIBLE_STATUSES = [
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
] as const;
const CANCELLED_STATUSES = [
  "CANCELLED_BY_COMPANY",
  "CANCELLED_BY_MOTOBOY",
] as const;

export interface TrackingRepository {
  getDeliveryForActor(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    deliveryId: string,
  ): Promise<TrackingDeliveryRecord | null | "forbidden">;
  saveLink(input: {
    deliveryId: string;
    tokenHash: string;
    tokenEncrypted: string;
    expiresAt: Date;
    now: Date;
  }): Promise<TrackingRecord>;
  revokeLink(deliveryId: string, now: Date): Promise<boolean>;
  updateLocation(input: {
    deliveryId: string;
    motoboyUserId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    now: Date;
    oldestAllowedLocationAt: Date;
  }): Promise<boolean>;
  getByTokenHash(tokenHash: string): Promise<TrackingDeliveryRecord | null>;
}

export interface TrackingRuntimeConfig {
  appUrl: string;
  encryptionKey: string;
  linkTtlHours: number;
  terminalTtlHours: number;
  locationMinIntervalSeconds: number;
  locationStaleSeconds: number;
}

function requireActor(actor: TrackingActor | null) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  return actor as TrackingActor & { role: "COMPANY" | "MOTOBOY" };
}

async function requireActorDelivery(
  actor: TrackingActor | null,
  rawDeliveryId: unknown,
  repository: TrackingRepository,
) {
  const currentActor = requireActor(actor);
  const deliveryId = trackingDeliveryIdSchema.parse(rawDeliveryId);
  const delivery = await repository.getDeliveryForActor(
    currentActor.userId,
    currentActor.role,
    deliveryId,
  );
  if (delivery === "forbidden") throw new TrackingAccessDeniedError();
  if (!delivery) throw new TrackingNotFoundError();
  return { actor: currentActor, delivery };
}

function isLinkEligible(status: TrackingDeliveryRecord["status"]) {
  return (LINK_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

function terminalExpiry(
  delivery: TrackingDeliveryRecord,
  configuredExpiry: Date,
  terminalTtlHours: number,
) {
  const terminalAt = delivery.completedAt ?? delivery.cancelledAt;
  if (!terminalAt) return configuredExpiry;
  const terminalLimit = new Date(
    terminalAt.getTime() + terminalTtlHours * 60 * 60 * 1_000,
  );
  return terminalLimit < configuredExpiry ? terminalLimit : configuredExpiry;
}

function stateFor(
  delivery: TrackingDeliveryRecord,
  now: Date,
  terminalTtlHours: number,
): TrackingLinkView["state"] {
  if (!delivery.tracking) return "NOT_CREATED";
  if (delivery.tracking.revokedAt) return "REVOKED";
  if (
    terminalExpiry(delivery, delivery.tracking.expiresAt, terminalTtlHours) <=
    now
  ) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

function isStale(lastLocationAt: Date | null, now: Date, staleSeconds: number) {
  return (
    !lastLocationAt ||
    now.getTime() - lastLocationAt.getTime() > staleSeconds * 1_000
  );
}

function buildLinkView(
  actor: TrackingActor & { role: "COMPANY" | "MOTOBOY" },
  delivery: TrackingDeliveryRecord,
  now: Date,
  config: TrackingRuntimeConfig,
): TrackingLinkView {
  const state = stateFor(delivery, now, config.terminalTtlHours);
  let url: string | null = null;
  if (state === "ACTIVE" && actor.role === "COMPANY" && delivery.tracking) {
    const rawToken = decryptPrivateField(
      delivery.tracking.tokenEncrypted,
      config.encryptionKey,
    );
    url = new URL(`/r/${rawToken}`, config.appUrl).toString();
  }
  return {
    state,
    canCreate: actor.role === "COMPANY" && isLinkEligible(delivery.status),
    url,
    expiresAt:
      state === "ACTIVE" && delivery.tracking
        ? terminalExpiry(
            delivery,
            delivery.tracking.expiresAt,
            config.terminalTtlHours,
          ).toISOString()
        : null,
    lastLocationAt: delivery.tracking?.lastLocationAt?.toISOString() ?? null,
    locationStale: isStale(
      delivery.tracking?.lastLocationAt ?? null,
      now,
      config.locationStaleSeconds,
    ),
    deliveryStatus: delivery.status,
  };
}

export async function getTrackingLink(
  actor: TrackingActor | null,
  deliveryId: unknown,
  repository: TrackingRepository,
  now: Date,
  config: TrackingRuntimeConfig,
) {
  const result = await requireActorDelivery(actor, deliveryId, repository);
  return buildLinkView(result.actor, result.delivery, now, config);
}

export async function createOrGetTrackingLink(
  actor: TrackingActor | null,
  deliveryId: unknown,
  repository: TrackingRepository,
  now: Date,
  config: TrackingRuntimeConfig,
) {
  const result = await requireActorDelivery(actor, deliveryId, repository);
  if (result.actor.role !== "COMPANY") throw new TrackingAccessDeniedError();
  if (!isLinkEligible(result.delivery.status)) {
    throw new TrackingUnavailableError(
      "O link pode ser ativado depois que um motoboy aceitar a entrega.",
    );
  }
  if (
    result.delivery.tracking &&
    stateFor(result.delivery, now, config.terminalTtlHours) === "ACTIVE"
  ) {
    return buildLinkView(result.actor, result.delivery, now, config);
  }

  const token = createTrackingToken();
  const tracking = await repository.saveLink({
    deliveryId: result.delivery.id,
    tokenHash: hashTrackingToken(token),
    tokenEncrypted: encryptPrivateField(token, config.encryptionKey),
    expiresAt: new Date(now.getTime() + config.linkTtlHours * 60 * 60 * 1_000),
    now,
  });
  return buildLinkView(
    result.actor,
    { ...result.delivery, tracking },
    now,
    config,
  );
}

export async function revokeTrackingLink(
  actor: TrackingActor | null,
  deliveryId: unknown,
  repository: TrackingRepository,
  now: Date,
) {
  const result = await requireActorDelivery(actor, deliveryId, repository);
  if (result.actor.role !== "COMPANY") throw new TrackingAccessDeniedError();
  await repository.revokeLink(result.delivery.id, now);
  return { revoked: true } as const;
}

export async function updateDeliveryTrackingLocation(
  actor: TrackingActor | null,
  deliveryId: unknown,
  input: unknown,
  repository: TrackingRepository,
  now: Date,
  config: TrackingRuntimeConfig,
) {
  const result = await requireActorDelivery(actor, deliveryId, repository);
  if (result.actor.role !== "MOTOBOY") throw new TrackingAccessDeniedError();
  if (result.delivery.status !== "IN_DELIVERY") {
    throw new TrackingUnavailableError(
      "A localização ao vivo começa somente ao iniciar a entrega ao cliente.",
    );
  }
  if (
    stateFor(result.delivery, now, config.terminalTtlHours) !== "ACTIVE" ||
    !result.delivery.tracking
  ) {
    throw new TrackingUnavailableError(
      "A empresa ainda não ativou o link de acompanhamento.",
    );
  }
  const location = trackingLocationSchema.parse(input);
  if (
    location.capturedAt.getTime() < now.getTime() - 10 * 60_000 ||
    location.capturedAt.getTime() > now.getTime() + 60_000
  ) {
    throw new TrackingUnavailableError(
      "A leitura do GPS está desatualizada. Obtenha uma nova localização.",
    );
  }
  const updated = await repository.updateLocation({
    deliveryId: result.delivery.id,
    motoboyUserId: result.actor.userId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters,
    now,
    oldestAllowedLocationAt: new Date(
      now.getTime() - config.locationMinIntervalSeconds * 1_000,
    ),
  });
  if (!updated) {
    throw new TrackingRateLimitError(config.locationMinIntervalSeconds);
  }
  return { updatedAt: now.toISOString() };
}

export async function getPublicTracking(
  rawToken: unknown,
  repository: TrackingRepository,
  now: Date,
  config: Pick<
    TrackingRuntimeConfig,
    "terminalTtlHours" | "locationStaleSeconds"
  >,
): Promise<PublicTrackingView> {
  const token = trackingTokenSchema.parse(rawToken);
  const delivery = await repository.getByTokenHash(hashTrackingToken(token));
  if (!delivery?.tracking || delivery.tracking.revokedAt) {
    throw new TrackingNotFoundError();
  }
  const effectiveExpiry = terminalExpiry(
    delivery,
    delivery.tracking.expiresAt,
    config.terminalTtlHours,
  );
  if (effectiveExpiry <= now) throw new TrackingExpiredError();

  const cancelled = (CANCELLED_STATUSES as readonly string[]).includes(
    delivery.status,
  );
  const livePhase = delivery.status === "IN_DELIVERY";
  const locationAvailable =
    livePhase &&
    delivery.tracking.lastLatitude !== null &&
    delivery.tracking.lastLongitude !== null &&
    delivery.tracking.lastLocationAt !== null;
  const stale = isStale(
    delivery.tracking.lastLocationAt,
    now,
    config.locationStaleSeconds,
  );
  const state: PublicTrackingView["state"] =
    delivery.status === "COMPLETED"
      ? "COMPLETED"
      : cancelled
        ? "CANCELLED"
        : locationAvailable
          ? stale
            ? "STALE"
            : "LIVE"
          : "WAITING";

  return {
    state,
    deliveryStatus: delivery.status,
    companyName: delivery.companyName,
    destination: livePhase
      ? {
          neighborhood: delivery.destinationNeighborhood,
          city: delivery.destinationCity,
          state: delivery.destinationState,
          latitude: delivery.destinationLatitude,
          longitude: delivery.destinationLongitude,
        }
      : null,
    location: locationAvailable
      ? {
          latitude: delivery.tracking.lastLatitude!,
          longitude: delivery.tracking.lastLongitude!,
          accuracyMeters: delivery.tracking.lastAccuracyMeters,
          updatedAt: delivery.tracking.lastLocationAt!.toISOString(),
        }
      : null,
    expiresAt: effectiveExpiry.toISOString(),
  };
}
