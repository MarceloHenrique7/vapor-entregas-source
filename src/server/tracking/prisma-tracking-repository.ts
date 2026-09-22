import { getPrisma } from "@/server/db/prisma";

import type { TrackingDeliveryRecord, TrackingRecord } from "./types";
import type { TrackingRepository } from "./tracking-service";

const trackingSelect = {
  id: true,
  deliveryId: true,
  tokenHash: true,
  tokenEncrypted: true,
  expiresAt: true,
  revokedAt: true,
  lastLatitude: true,
  lastLongitude: true,
  lastAccuracyMeters: true,
  lastLocationAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const deliveryTrackingSelect = {
  id: true,
  status: true,
  destinationNeighborhood: true,
  destinationCity: true,
  destinationState: true,
  destinationLatitude: true,
  destinationLongitude: true,
  completedAt: true,
  cancelledAt: true,
  company: {
    select: { userId: true, fantasyName: true },
  },
  motoboy: {
    select: { userId: true },
  },
  tracking: { select: trackingSelect },
} as const;

type PrismaTracking = {
  id: string;
  deliveryId: string;
  tokenHash: string;
  tokenEncrypted: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastLatitude: { toNumber(): number } | null;
  lastLongitude: { toNumber(): number } | null;
  lastAccuracyMeters: { toNumber(): number } | null;
  lastLocationAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toTrackingRecord(tracking: PrismaTracking): TrackingRecord {
  return {
    ...tracking,
    lastLatitude: tracking.lastLatitude?.toNumber() ?? null,
    lastLongitude: tracking.lastLongitude?.toNumber() ?? null,
    lastAccuracyMeters: tracking.lastAccuracyMeters?.toNumber() ?? null,
  };
}

function toDeliveryRecord(delivery: {
  id: string;
  status: TrackingDeliveryRecord["status"];
  destinationNeighborhood: string;
  destinationCity: TrackingDeliveryRecord["destinationCity"];
  destinationState: string;
  destinationLatitude: { toNumber(): number };
  destinationLongitude: { toNumber(): number };
  completedAt: Date | null;
  cancelledAt: Date | null;
  company: { userId: string; fantasyName: string };
  motoboy: { userId: string } | null;
  tracking: PrismaTracking | null;
}): TrackingDeliveryRecord {
  return {
    id: delivery.id,
    status: delivery.status,
    companyName: delivery.company.fantasyName,
    companyUserId: delivery.company.userId,
    motoboyUserId: delivery.motoboy?.userId ?? null,
    destinationNeighborhood: delivery.destinationNeighborhood,
    destinationCity: delivery.destinationCity,
    destinationState: delivery.destinationState,
    destinationLatitude: delivery.destinationLatitude.toNumber(),
    destinationLongitude: delivery.destinationLongitude.toNumber(),
    completedAt: delivery.completedAt,
    cancelledAt: delivery.cancelledAt,
    tracking: delivery.tracking ? toTrackingRecord(delivery.tracking) : null,
  };
}

export const prismaTrackingRepository: TrackingRepository = {
  async getDeliveryForActor(userId, role, deliveryId) {
    const delivery = await getPrisma().delivery.findUnique({
      where: { id: deliveryId },
      select: deliveryTrackingSelect,
    });
    if (!delivery) return null;
    const ownsDelivery =
      role === "COMPANY"
        ? delivery.company.userId === userId
        : delivery.motoboy?.userId === userId;
    return ownsDelivery ? toDeliveryRecord(delivery) : "forbidden";
  },

  async saveLink(input) {
    const tracking = await getPrisma().deliveryTracking.upsert({
      where: { deliveryId: input.deliveryId },
      create: {
        deliveryId: input.deliveryId,
        tokenHash: input.tokenHash,
        tokenEncrypted: input.tokenEncrypted,
        expiresAt: input.expiresAt,
        createdAt: input.now,
        updatedAt: input.now,
      },
      update: {
        tokenHash: input.tokenHash,
        tokenEncrypted: input.tokenEncrypted,
        expiresAt: input.expiresAt,
        revokedAt: null,
        lastLatitude: null,
        lastLongitude: null,
        lastAccuracyMeters: null,
        lastLocationAt: null,
        updatedAt: input.now,
      },
      select: trackingSelect,
    });
    return toTrackingRecord(tracking);
  },

  async revokeLink(deliveryId, now) {
    const result = await getPrisma().deliveryTracking.updateMany({
      where: { deliveryId, revokedAt: null },
      data: { revokedAt: now, updatedAt: now },
    });
    return result.count === 1;
  },

  async updateLocation(input) {
    const motoboy = await getPrisma().motoboyProfile.findUnique({
      where: { userId: input.motoboyUserId },
      select: { id: true },
    });
    if (!motoboy) return false;
    const result = await getPrisma().deliveryTracking.updateMany({
      where: {
        deliveryId: input.deliveryId,
        revokedAt: null,
        expiresAt: { gt: input.now },
        OR: [
          { lastLocationAt: null },
          { lastLocationAt: { lte: input.oldestAllowedLocationAt } },
        ],
        delivery: {
          motoboyId: motoboy.id,
          status: "IN_DELIVERY",
        },
      },
      data: {
        lastLatitude: input.latitude,
        lastLongitude: input.longitude,
        lastAccuracyMeters: input.accuracyMeters,
        lastLocationAt: input.now,
        updatedAt: input.now,
      },
    });
    return result.count === 1;
  },

  async getByTokenHash(tokenHash) {
    const delivery = await getPrisma().delivery.findFirst({
      where: { tracking: { tokenHash } },
      select: deliveryTrackingSelect,
    });
    return delivery ? toDeliveryRecord(delivery) : null;
  },
};
