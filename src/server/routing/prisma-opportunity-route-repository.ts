import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { OpportunityRouteRepository } from "./opportunity-route-service";

export const prismaOpportunityRouteRepository: OpportunityRouteRepository = {
  async getContext(userId, deliveryId, now) {
    const motoboy = await getPrisma().motoboyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        city: true,
        isOnline: true,
        lastLocationAt: true,
        lastLatitude: true,
        lastLongitude: true,
      },
    });
    if (!motoboy) return null;

    const delivery = await getPrisma().delivery.findFirst({
      where: {
        id: deliveryId,
        pickupCity: motoboy.city,
        status: "SEARCHING_MOTOBOY",
        motoboyId: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        pickupLatitude: true,
        pickupLongitude: true,
      },
    });
    if (!delivery) return null;

    return {
      motoboy: {
        id: motoboy.id,
        city: motoboy.city,
        isOnline: motoboy.isOnline,
        lastLocationAt: motoboy.lastLocationAt,
        lastLatitude: motoboy.lastLatitude?.toNumber() ?? null,
        lastLongitude: motoboy.lastLongitude?.toNumber() ?? null,
      },
      delivery: {
        id: delivery.id,
        pickupLatitude: delivery.pickupLatitude.toNumber(),
        pickupLongitude: delivery.pickupLongitude.toNumber(),
      },
    };
  },
};
