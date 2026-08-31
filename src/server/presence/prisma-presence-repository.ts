import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { PresenceRepository } from "./presence-service";

const presenceSelect = {
  id: true,
  userId: true,
  isOnline: true,
  onlineSince: true,
  lastLocationAt: true,
  lastLatitude: true,
  lastLongitude: true,
} as const;

function toRecord(profile: {
  id: string;
  userId: string;
  isOnline: boolean;
  onlineSince: Date | null;
  lastLocationAt: Date | null;
  lastLatitude: { toNumber(): number } | null;
  lastLongitude: { toNumber(): number } | null;
}) {
  return {
    motoboyId: profile.id,
    userId: profile.userId,
    isOnline: profile.isOnline,
    onlineSince: profile.onlineSince,
    lastLocationAt: profile.lastLocationAt,
    lastLatitude: profile.lastLatitude?.toNumber() ?? null,
    lastLongitude: profile.lastLongitude?.toNumber() ?? null,
  };
}

async function findPresence(userId: string) {
  const profile = await getPrisma().motoboyProfile.findUnique({
    where: { userId },
    select: presenceSelect,
  });
  return profile ? toRecord(profile) : null;
}

export const prismaPresenceRepository: PresenceRepository = {
  getByUserId: findPresence,

  async setOnline(userId, coordinates, now) {
    const result = await getPrisma().motoboyProfile.updateMany({
      where: { userId },
      data: {
        isOnline: true,
        onlineSince: now,
        lastLocationAt: now,
        lastLatitude: coordinates.latitude,
        lastLongitude: coordinates.longitude,
      },
    });
    return result.count === 1 ? findPresence(userId) : null;
  },

  async updateLocationWhileOnline(
    userId,
    coordinates,
    now,
    oldestAllowedLocationAt,
  ) {
    const result = await getPrisma().motoboyProfile.updateMany({
      where: {
        userId,
        isOnline: true,
        OR: [
          { lastLocationAt: null },
          { lastLocationAt: { lte: oldestAllowedLocationAt } },
        ],
      },
      data: {
        lastLocationAt: now,
        lastLatitude: coordinates.latitude,
        lastLongitude: coordinates.longitude,
      },
    });
    return result.count === 1 ? findPresence(userId) : null;
  },

  async setOffline(userId, now) {
    const result = await getPrisma().motoboyProfile.updateMany({
      where: { userId },
      data: { isOnline: false, onlineSince: null, updatedAt: now },
    });
    return result.count === 1 ? findPresence(userId) : null;
  },
};
