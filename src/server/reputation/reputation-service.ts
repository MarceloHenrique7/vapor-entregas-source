import { createHash } from "node:crypto";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { isMotoboyEffectivelyOnline } from "@/server/presence/presence-service";

import {
  DeliveryNotEligibleError,
  DuplicateFavoriteError,
  DuplicateRatingError,
  DuplicateReportError,
  FavoriteNotFoundError,
  ReputationAccessDeniedError,
} from "./errors";
import {
  createFavoriteSchema,
  createRatingSchema,
  createReportSchema,
  favoriteIdSchema,
  type CreateRatingInput,
  type CreateReportInput,
} from "./schemas";
import type {
  DeliveryParticipants,
  FavoriteRecord,
  FavoriteView,
  RatingOverview,
  RatingView,
  ReportView,
  ReputationActor,
} from "./types";

export interface ReputationRepository {
  getDeliveryParticipants(
    deliveryId: string,
  ): Promise<DeliveryParticipants | null>;
  createRating(data: {
    deliveryId: string;
    reviewerUserId: string;
    reviewedUserId: string;
    reviewerRole: "COMPANY" | "MOTOBOY";
    score: number;
    comment?: string;
    now: Date;
  }): Promise<{ kind: "created"; rating: RatingView } | { kind: "duplicate" }>;
  getRatingOverview(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
  ): Promise<RatingOverview>;
  createFavorite(data: {
    companyProfileId: string;
    motoboyProfileId: string;
    now: Date;
  }): Promise<
    { kind: "created"; favorite: FavoriteRecord } | { kind: "duplicate" }
  >;
  removeFavorite(companyUserId: string, favoriteId: string): Promise<boolean>;
  listFavorites(companyUserId: string): Promise<FavoriteRecord[] | null>;
  createReport(data: {
    reporterUserId: string;
    reportedUserId: string;
    deliveryId: string;
    category: CreateReportInput["category"];
    description: string;
    fingerprint: string;
    now: Date;
  }): Promise<{ kind: "created"; report: ReportView } | { kind: "duplicate" }>;
  listReports(reporterUserId: string): Promise<ReportView[]>;
}

function requireParticipantActor(
  actor: ReputationActor | null,
): ReputationActor & { role: "COMPANY" | "MOTOBOY" } {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  return actor as ReputationActor & { role: "COMPANY" | "MOTOBOY" };
}

function getCounterparty(
  actor: ReputationActor & { role: "COMPANY" | "MOTOBOY" },
  delivery: DeliveryParticipants,
) {
  if (actor.role === "COMPANY" && actor.userId === delivery.companyUserId) {
    if (!delivery.motoboyUserId || !delivery.motoboyName) {
      throw new DeliveryNotEligibleError(
        "A entrega não possui motoboy vinculado.",
      );
    }
    return {
      userId: delivery.motoboyUserId,
      name: delivery.motoboyName,
      profileId: delivery.motoboyProfileId,
    };
  }
  if (actor.role === "MOTOBOY" && actor.userId === delivery.motoboyUserId) {
    return {
      userId: delivery.companyUserId,
      name: delivery.companyName,
      profileId: delivery.companyProfileId,
    };
  }
  throw new ReputationAccessDeniedError();
}

export async function createRating(
  actor: ReputationActor | null,
  input: unknown,
  repository: ReputationRepository,
  now: Date,
) {
  const participant = requireParticipantActor(actor);
  const validated: CreateRatingInput = createRatingSchema.parse(input);
  const delivery = await repository.getDeliveryParticipants(
    validated.deliveryId,
  );
  if (!delivery) throw new DeliveryNotEligibleError("Entrega não encontrada.");
  if (delivery.status !== "COMPLETED") throw new DeliveryNotEligibleError();
  const counterparty = getCounterparty(participant, delivery);
  if (counterparty.userId === participant.userId) {
    throw new ReputationAccessDeniedError();
  }
  const result = await repository.createRating({
    deliveryId: delivery.deliveryId,
    reviewerUserId: participant.userId,
    reviewedUserId: counterparty.userId,
    reviewerRole: participant.role,
    score: validated.score,
    comment: validated.comment,
    now,
  });
  if (result.kind === "duplicate") throw new DuplicateRatingError();
  return result.rating;
}

export async function getRatingOverview(
  actor: ReputationActor | null,
  repository: ReputationRepository,
) {
  const participant = requireParticipantActor(actor);
  const overview = await repository.getRatingOverview(
    participant.userId,
    participant.role,
  );
  return {
    ...overview,
    received: normalizeRatingSummary(overview.received),
    counterparties: Object.fromEntries(
      Object.entries(overview.counterparties).map(([deliveryId, summary]) => [
        deliveryId,
        { ...summary, ...normalizeRatingSummary(summary) },
      ]),
    ),
  };
}

export function normalizeRatingSummary(summary: {
  average: number | null;
  count: number;
}) {
  return {
    average:
      summary.average === null ? null : Math.round(summary.average * 10) / 10,
    count: summary.count,
  };
}

export async function addFavorite(
  actor: ReputationActor | null,
  input: unknown,
  repository: ReputationRepository,
  now: Date,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const { deliveryId } = createFavoriteSchema.parse(input);
  const delivery = await repository.getDeliveryParticipants(deliveryId);
  if (!delivery || delivery.companyUserId !== actor.userId) {
    throw new ReputationAccessDeniedError();
  }
  if (delivery.status !== "COMPLETED" || !delivery.motoboyProfileId) {
    throw new DeliveryNotEligibleError(
      "Somente motoboys de entregas concluídas podem ser favoritados.",
    );
  }
  const result = await repository.createFavorite({
    companyProfileId: delivery.companyProfileId,
    motoboyProfileId: delivery.motoboyProfileId,
    now,
  });
  if (result.kind === "duplicate") throw new DuplicateFavoriteError();
  return toFavoriteView(result.favorite, now, 0);
}

export async function removeFavorite(
  actor: ReputationActor | null,
  rawFavoriteId: unknown,
  repository: ReputationRepository,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const favoriteId = favoriteIdSchema.parse(rawFavoriteId);
  if (!(await repository.removeFavorite(actor.userId, favoriteId))) {
    throw new FavoriteNotFoundError();
  }
}

function toFavoriteView(
  favorite: FavoriteRecord,
  now: Date,
  presenceTtlMinutes: number,
): FavoriteView {
  const view = { ...favorite } as Record<string, unknown>;
  delete view.motoboyUserId;
  delete view.lastLocationAt;
  return {
    ...(view as unknown as FavoriteView),
    ratingAverage:
      favorite.ratingAverage === null
        ? null
        : Math.round(favorite.ratingAverage * 10) / 10,
    isOnline: isMotoboyEffectivelyOnline(
      {
        isOnline: favorite.isOnline,
        lastLocationAt: favorite.lastLocationAt,
      },
      now,
      presenceTtlMinutes,
    ),
  };
}

export async function listFavorites(
  actor: ReputationActor | null,
  repository: ReputationRepository,
  now: Date,
  presenceTtlMinutes: number,
) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const favorites = await repository.listFavorites(actor.userId);
  if (!favorites) throw new ReputationAccessDeniedError();
  return favorites.map((favorite) =>
    toFavoriteView(favorite, now, presenceTtlMinutes),
  );
}

export async function createReport(
  actor: ReputationActor | null,
  input: unknown,
  repository: ReputationRepository,
  now: Date,
) {
  const participant = requireParticipantActor(actor);
  const validated = createReportSchema.parse(input);
  const delivery = await repository.getDeliveryParticipants(
    validated.deliveryId,
  );
  if (!delivery) throw new DeliveryNotEligibleError("Entrega não encontrada.");
  const counterparty = getCounterparty(participant, delivery);
  const normalized = validated.description
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
  const fingerprint = createHash("sha256")
    .update(
      [
        validated.deliveryId,
        counterparty.userId,
        validated.category,
        normalized,
      ].join("|"),
    )
    .digest("hex");
  const result = await repository.createReport({
    reporterUserId: participant.userId,
    reportedUserId: counterparty.userId,
    deliveryId: delivery.deliveryId,
    category: validated.category,
    description: validated.description,
    fingerprint,
    now,
  });
  if (result.kind === "duplicate") throw new DuplicateReportError();
  return result.report;
}

export async function listOwnReports(
  actor: ReputationActor | null,
  repository: ReputationRepository,
) {
  const participant = requireParticipantActor(actor);
  return repository.listReports(participant.userId);
}
