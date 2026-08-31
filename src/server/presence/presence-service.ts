import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import {
  calculateStraightLineDistance,
  type Coordinates,
} from "@/lib/maps/geo";

import {
  MotoboyOfflineError,
  MotoboyProfileNotFoundError,
  PresenceRateLimitError,
} from "./errors";
import { presenceCoordinatesSchema, type PresenceCoordinates } from "./schemas";
import type {
  MotoboyPresenceRecord,
  PresenceActor,
  PublicMotoboyPresence,
} from "./types";

export interface PresenceRepository {
  getByUserId(userId: string): Promise<MotoboyPresenceRecord | null>;
  setOnline(
    userId: string,
    coordinates: PresenceCoordinates,
    now: Date,
  ): Promise<MotoboyPresenceRecord | null>;
  updateLocationWhileOnline(
    userId: string,
    coordinates: PresenceCoordinates,
    now: Date,
    oldestAllowedLocationAt: Date,
  ): Promise<MotoboyPresenceRecord | null>;
  setOffline(userId: string, now: Date): Promise<MotoboyPresenceRecord | null>;
}

function requireMotoboy(actor: PresenceActor | null): PresenceActor {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "MOTOBOY") throw new ForbiddenError();
  return actor;
}

export function isMotoboyEffectivelyOnline(
  presence: Pick<MotoboyPresenceRecord, "isOnline" | "lastLocationAt">,
  now: Date,
  ttlMinutes: number,
) {
  if (!presence.isOnline || !presence.lastLocationAt) return false;
  const cutoff = now.getTime() - ttlMinutes * 60 * 1_000;
  return presence.lastLocationAt.getTime() >= cutoff;
}

export function toPublicPresence(
  presence: MotoboyPresenceRecord,
  now: Date,
  ttlMinutes: number,
): PublicMotoboyPresence {
  const effectiveOnline = isMotoboyEffectivelyOnline(presence, now, ttlMinutes);
  return {
    isOnline: effectiveOnline,
    onlineSince: effectiveOnline
      ? (presence.onlineSince?.toISOString() ?? null)
      : null,
    lastLocationAt: presence.lastLocationAt?.toISOString() ?? null,
    expiresAt:
      effectiveOnline && presence.lastLocationAt
        ? new Date(
            presence.lastLocationAt.getTime() + ttlMinutes * 60 * 1_000,
          ).toISOString()
        : null,
  };
}

export async function getMotoboyPresence(
  actor: PresenceActor | null,
  repository: PresenceRepository,
  now: Date,
  ttlMinutes: number,
) {
  const motoboy = requireMotoboy(actor);
  const presence = await repository.getByUserId(motoboy.userId);
  if (!presence) throw new MotoboyProfileNotFoundError();
  return toPublicPresence(presence, now, ttlMinutes);
}

export async function setMotoboyOnline(
  actor: PresenceActor | null,
  input: unknown,
  repository: PresenceRepository,
  now: Date,
  ttlMinutes: number,
) {
  const motoboy = requireMotoboy(actor);
  const coordinates = presenceCoordinatesSchema.parse(input);
  const presence = await repository.setOnline(motoboy.userId, coordinates, now);
  if (!presence) throw new MotoboyProfileNotFoundError();
  return toPublicPresence(presence, now, ttlMinutes);
}

export async function updateMotoboyLocation(
  actor: PresenceActor | null,
  input: unknown,
  repository: PresenceRepository,
  now: Date,
  ttlMinutes: number,
  minimumIntervalSeconds: number,
) {
  const motoboy = requireMotoboy(actor);
  const coordinates = presenceCoordinatesSchema.parse(input);
  const oldestAllowedLocationAt = new Date(
    now.getTime() - minimumIntervalSeconds * 1_000,
  );
  const presence = await repository.updateLocationWhileOnline(
    motoboy.userId,
    coordinates,
    now,
    oldestAllowedLocationAt,
  );
  if (presence) return toPublicPresence(presence, now, ttlMinutes);

  const current = await repository.getByUserId(motoboy.userId);
  if (!current) throw new MotoboyProfileNotFoundError();
  if (!current.isOnline) throw new MotoboyOfflineError();
  const elapsedSeconds = current.lastLocationAt
    ? Math.max(0, (now.getTime() - current.lastLocationAt.getTime()) / 1_000)
    : minimumIntervalSeconds;
  throw new PresenceRateLimitError(
    Math.max(1, Math.ceil(minimumIntervalSeconds - elapsedSeconds)),
  );
}

export async function setMotoboyOffline(
  actor: PresenceActor | null,
  repository: PresenceRepository,
  now: Date,
  ttlMinutes: number,
) {
  const motoboy = requireMotoboy(actor);
  const presence = await repository.setOffline(motoboy.userId, now);
  if (!presence) throw new MotoboyProfileNotFoundError();
  return toPublicPresence(presence, now, ttlMinutes);
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  return calculateStraightLineDistance(from, to);
}
