import "server-only";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import type { Role } from "@/server/auth/types";
import { deliveryIdSchema } from "@/server/deliveries/schemas";
import type { DeliveryExtraView } from "@/server/deliveries/types";

import {
  DeliveryExtraAccessDeniedError,
  DeliveryExtraConflictError,
  DeliveryExtraNotFoundError,
} from "./errors";
import {
  addDeliveryExtraSchema,
  extraIdSchema,
  respondDeliveryExtraSchema,
  type AddDeliveryExtraInput,
  type RespondDeliveryExtraInput,
} from "./schemas";

export interface DeliveryExtraActor {
  userId: string;
  role: Role;
}

export type ExtraMutationResult =
  | { kind: "updated"; extra: DeliveryExtraView }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "conflict" };

export interface DeliveryExtraRepository {
  addExtra(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    deliveryId: string,
    input: AddDeliveryExtraInput,
    now: Date,
  ): Promise<ExtraMutationResult>;
  respondToExtra(
    userId: string,
    role: "COMPANY" | "MOTOBOY",
    deliveryId: string,
    extraId: string,
    input: RespondDeliveryExtraInput,
    now: Date,
  ): Promise<ExtraMutationResult>;
}

function requireParticipant(actor: DeliveryExtraActor | null) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY" && actor.role !== "MOTOBOY") {
    throw new ForbiddenError();
  }
  return actor as DeliveryExtraActor & { role: "COMPANY" | "MOTOBOY" };
}

function resolve(result: ExtraMutationResult) {
  if (result.kind === "not_found") throw new DeliveryExtraNotFoundError();
  if (result.kind === "forbidden") throw new DeliveryExtraAccessDeniedError();
  if (result.kind === "conflict") throw new DeliveryExtraConflictError();
  return result.extra;
}

export async function addDeliveryExtra(
  actor: DeliveryExtraActor | null,
  rawDeliveryId: unknown,
  input: unknown,
  repository: DeliveryExtraRepository,
  now: Date,
) {
  const participant = requireParticipant(actor);
  return resolve(
    await repository.addExtra(
      participant.userId,
      participant.role,
      deliveryIdSchema.parse(rawDeliveryId),
      addDeliveryExtraSchema.parse(input),
      now,
    ),
  );
}

export async function respondToDeliveryExtra(
  actor: DeliveryExtraActor | null,
  rawDeliveryId: unknown,
  rawExtraId: unknown,
  input: unknown,
  repository: DeliveryExtraRepository,
  now: Date,
) {
  const participant = requireParticipant(actor);
  return resolve(
    await repository.respondToExtra(
      participant.userId,
      participant.role,
      deliveryIdSchema.parse(rawDeliveryId),
      extraIdSchema.parse(rawExtraId),
      respondDeliveryExtraSchema.parse(input),
      now,
    ),
  );
}
