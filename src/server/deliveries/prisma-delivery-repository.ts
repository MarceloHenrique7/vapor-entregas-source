import "server-only";

import { calculateStraightLineDistance } from "@/lib/maps/geo";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import type { DeliveryRepository } from "./delivery-service";
import type { DeliveryRecord, DeliveryStatus } from "./types";

const deliverySelect = {
  id: true,
  companyId: true,
  motoboyId: true,
  pickupLabel: true,
  pickupAddress: true,
  pickupNumber: true,
  pickupNeighborhood: true,
  pickupCity: true,
  pickupState: true,
  pickupLatitude: true,
  pickupLongitude: true,
  destinationAddress: true,
  destinationNumber: true,
  destinationNeighborhood: true,
  destinationComplement: true,
  destinationReference: true,
  destinationCity: true,
  destinationState: true,
  destinationLatitude: true,
  destinationLongitude: true,
  distanceEstimateKm: true,
  distanceMethod: true,
  routeDurationSeconds: true,
  routeCalculatedAt: true,
  suggestedPrice: true,
  offeredPrice: true,
  paymentMethod: true,
  notes: true,
  status: true,
  acceptedAt: true,
  pickedUpAt: true,
  completedAt: true,
  cancelledAt: true,
  expiresAt: true,
  createdAt: true,
  company: { select: { fantasyName: true, userId: true } },
  motoboy: { select: { user: { select: { name: true } } } },
  statusHistory: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      previousStatus: true,
      newStatus: true,
      actorRole: true,
      note: true,
      createdAt: true,
    },
  },
  extras: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      type: true,
      description: true,
      amount: true,
      informedByRole: true,
      status: true,
      note: true,
      createdAt: true,
      history: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          action: true,
          actorRole: true,
          note: true,
          createdAt: true,
        },
      },
    },
  },
} as const;

function toRecord(
  delivery: {
    id: string;
    companyId: string;
    motoboyId: string | null;
    pickupLabel: string;
    pickupAddress: string;
    pickupNumber: string;
    pickupNeighborhood: string;
    pickupCity: "PETROLINA_PE" | "JUAZEIRO_BA";
    pickupState: string;
    pickupLatitude: { toNumber(): number };
    pickupLongitude: { toNumber(): number };
    destinationAddress: string;
    destinationNumber: string;
    destinationNeighborhood: string;
    destinationComplement: string | null;
    destinationReference: string | null;
    destinationCity: "PETROLINA_PE" | "JUAZEIRO_BA";
    destinationState: string;
    destinationLatitude: { toNumber(): number };
    destinationLongitude: { toNumber(): number };
    distanceEstimateKm: { toNumber(): number };
    distanceMethod: "STRAIGHT_LINE" | "GOOGLE_ROUTES";
    routeDurationSeconds: number | null;
    routeCalculatedAt: Date | null;
    suggestedPrice: { toNumber(): number } | null;
    offeredPrice: { toNumber(): number };
    paymentMethod: "PIX" | "CASH" | "COMPANY_SETTLEMENT" | "OTHER";
    notes: string | null;
    status: DeliveryStatus;
    acceptedAt: Date | null;
    pickedUpAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
    company: { fantasyName: string; userId: string };
    motoboy: { user: { name: string } } | null;
    statusHistory: Array<{
      id: string;
      previousStatus: DeliveryStatus | null;
      newStatus: DeliveryStatus;
      actorRole: "MOTOBOY" | "COMPANY" | "ADMIN" | null;
      note: string | null;
      createdAt: Date;
    }>;
    extras: Array<{
      id: string;
      type:
        | "WAITING"
        | "RETURN"
        | "PURCHASE"
        | "SPECIAL_WEIGHT_VOLUME"
        | "CANCELLATION_AFTER_DEPARTURE"
        | "OTHER";
      description: string;
      amount: { toNumber(): number } | null;
      informedByRole: "MOTOBOY" | "COMPANY" | "ADMIN";
      status: "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
      note: string | null;
      createdAt: Date;
      history: Array<{
        id: string;
        previousStatus:
          "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED" | null;
        newStatus: "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
        action: "CREATED" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
        actorRole: "MOTOBOY" | "COMPANY" | "ADMIN";
        note: string | null;
        createdAt: Date;
      }>;
    }>;
  },
  companyRating?: { average: number | null; count: number },
): DeliveryRecord {
  const { company, motoboy, statusHistory, extras, ...record } = delivery;
  return {
    ...record,
    companyName: company.fantasyName,
    motoboyName: motoboy?.user.name ?? null,
    pickupLatitude: delivery.pickupLatitude.toNumber(),
    pickupLongitude: delivery.pickupLongitude.toNumber(),
    destinationLatitude: delivery.destinationLatitude.toNumber(),
    destinationLongitude: delivery.destinationLongitude.toNumber(),
    distanceEstimateKm: delivery.distanceEstimateKm.toNumber(),
    routeCalculatedAt: delivery.routeCalculatedAt?.toISOString() ?? null,
    suggestedPrice: delivery.suggestedPrice?.toNumber() ?? null,
    ...(companyRating
      ? {
          companyRatingAverage: companyRating.average,
          companyRatingCount: companyRating.count,
        }
      : {}),
    offeredPrice: delivery.offeredPrice.toNumber(),
    acceptedAt: delivery.acceptedAt?.toISOString() ?? null,
    pickedUpAt: delivery.pickedUpAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    cancelledAt: delivery.cancelledAt?.toISOString() ?? null,
    expiresAt: delivery.expiresAt.toISOString(),
    createdAt: delivery.createdAt.toISOString(),
    history: statusHistory.map((history) => ({
      ...history,
      createdAt: history.createdAt.toISOString(),
    })),
    extras: extras.map((extra) => ({
      ...extra,
      amount: extra.amount?.toNumber() ?? null,
      createdAt: extra.createdAt.toISOString(),
      history: extra.history.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    })),
  };
}

export const prismaDeliveryRepository: DeliveryRepository = {
  async getCompanyPickup(userId) {
    const profile = await getPrisma().companyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        fantasyName: true,
        locations: {
          where: {
            isDefault: true,
            latitude: { not: null },
            longitude: { not: null },
          },
          take: 1,
          select: {
            id: true,
            label: true,
            address: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
    const location = profile?.locations[0];
    if (!profile || !location?.latitude || !location.longitude) return null;
    return {
      companyId: profile.id,
      companyName: profile.fantasyName,
      locationId: location.id,
      label: location.label,
      address: location.address,
      number: location.number,
      neighborhood: location.neighborhood,
      city: location.city,
      state: location.state,
      latitude: location.latitude.toNumber(),
      longitude: location.longitude.toNumber(),
    };
  },

  async getActiveRule(city, now) {
    const rule = await getPrisma().pricingRule.findFirst({
      where: {
        city,
        enabled: true,
        activeFrom: { lte: now },
        OR: [{ activeTo: null }, { activeTo: { gt: now } }],
      },
      orderBy: { activeFrom: "desc" },
      select: {
        id: true,
        city: true,
        basePrice: true,
        pricePerKm: true,
        minimumPrice: true,
        enabled: true,
        activeFrom: true,
        activeTo: true,
        createdAt: true,
      },
    });
    return rule
      ? {
          ...rule,
          basePrice: rule.basePrice.toNumber(),
          pricePerKm: rule.pricePerKm.toNumber(),
          minimumPrice: rule.minimumPrice.toNumber(),
        }
      : null;
  },

  async createDelivery(actorUserId, pickup, input, pricing, expiresAt) {
    const { extras = [], ...deliveryInput } = input;
    const delivery = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.delivery.create({
        data: {
          companyId: pickup.companyId,
          pickupLocationId: pickup.locationId,
          pickupLabel: pickup.label,
          pickupAddress: pickup.address,
          pickupNumber: pickup.number,
          pickupNeighborhood: pickup.neighborhood,
          pickupCity: pickup.city,
          pickupState: pickup.state,
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          ...deliveryInput,
          distanceEstimateKm: pricing.distanceEstimateKm,
          distanceMethod: pricing.distanceMethod,
          routeDurationSeconds: pricing.routeDurationSeconds,
          routeCalculatedAt: pricing.routeCalculatedAt,
          suggestedPrice: pricing.suggestedPrice,
          pricingRuleId: pricing.pricingRuleId,
          expiresAt,
          ...(extras.length
            ? {
                extras: {
                  create: extras.map((extra) => ({
                    type: extra.type,
                    description: extra.description,
                    amount: extra.amount,
                    note: extra.note,
                    informedByUserId: actorUserId,
                    informedByRole: "COMPANY" as const,
                    history: {
                      create: {
                        previousStatus: null,
                        newStatus: "PENDING" as const,
                        action: "CREATED" as const,
                        actorUserId,
                        actorRole: "COMPANY" as const,
                        note: "Adicional informado antes da publicação.",
                      },
                    },
                  })),
                },
              }
            : {}),
        },
        select: deliverySelect,
      });
      await transaction.deliveryStatusHistory.create({
        data: {
          deliveryId: created.id,
          previousStatus: null,
          newStatus: "SEARCHING_MOTOBOY",
          actorUserId,
          actorRole: "COMPANY",
        },
      });
      return created;
    });
    return toRecord(delivery);
  },

  async listCompanyDeliveries(userId) {
    const profile = await getPrisma().companyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    const deliveries = await getPrisma().delivery.findMany({
      where: { companyId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: deliverySelect,
    });
    return deliveries.map((delivery) => toRecord(delivery));
  },

  async getMotoboyContext(userId) {
    const profile = await getPrisma().motoboyProfile.findUnique({
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
    return profile
      ? {
          id: profile.id,
          city: profile.city,
          isOnline: profile.isOnline,
          lastLocationAt: profile.lastLocationAt,
          lastLatitude: profile.lastLatitude?.toNumber() ?? null,
          lastLongitude: profile.lastLongitude?.toNumber() ?? null,
        }
      : null;
  },

  async listOpenDeliveries(city, now) {
    const deliveries = await getPrisma().delivery.findMany({
      where: {
        pickupCity: city,
        status: "SEARCHING_MOTOBOY",
        motoboyId: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: deliverySelect,
    });
    const ratings = deliveries.length
      ? await getPrisma().rating.groupBy({
          by: ["reviewedUserId"],
          where: {
            reviewedUserId: {
              in: [
                ...new Set(
                  deliveries.map((delivery) => delivery.company.userId),
                ),
              ],
            },
          },
          _avg: { score: true },
          _count: { _all: true },
        })
      : [];
    const ratingByCompany = new Map(
      ratings.map((rating) => [rating.reviewedUserId, rating]),
    );
    return deliveries.map((delivery) => {
      const rating = ratingByCompany.get(delivery.company.userId);
      return toRecord(delivery, {
        average:
          rating?._avg.score === null || rating?._avg.score === undefined
            ? null
            : Math.round(rating._avg.score * 10) / 10,
        count: rating?._count._all ?? 0,
      });
    });
  },

  async acceptDeliveryAtomically(
    userId,
    deliveryId,
    now,
    presenceCutoff,
    radiusKm,
    extrasAcknowledged,
  ) {
    try {
      return await getPrisma().$transaction(async (transaction) => {
        const motoboy = await transaction.motoboyProfile.findUnique({
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
        if (
          !motoboy?.isOnline ||
          !motoboy.lastLocationAt ||
          motoboy.lastLocationAt < presenceCutoff ||
          motoboy.lastLatitude === null ||
          motoboy.lastLongitude === null
        ) {
          return { kind: "offline" } as const;
        }
        const activeDelivery = await transaction.delivery.findFirst({
          where: {
            motoboyId: motoboy.id,
            status: {
              in: [
                "ACCEPTED",
                "MOTOBOY_TO_PICKUP",
                "ARRIVED_AT_PICKUP",
                "PICKED_UP",
                "IN_DELIVERY",
              ],
            },
          },
          select: { id: true },
        });
        if (activeDelivery) return { kind: "unavailable" } as const;
        const candidate = await transaction.delivery.findUnique({
          where: { id: deliveryId },
          select: {
            pickupCity: true,
            pickupLatitude: true,
            pickupLongitude: true,
            extras: {
              where: { status: "PENDING" },
              select: { id: true },
            },
          },
        });
        if (!candidate || candidate.pickupCity !== motoboy.city) {
          return { kind: "unavailable" } as const;
        }
        const distanceKm = calculateStraightLineDistance(
          {
            latitude: motoboy.lastLatitude.toNumber(),
            longitude: motoboy.lastLongitude.toNumber(),
          },
          {
            latitude: candidate.pickupLatitude.toNumber(),
            longitude: candidate.pickupLongitude.toNumber(),
          },
        );
        if (distanceKm > radiusKm) return { kind: "unavailable" } as const;
        if (candidate.extras.length > 0 && !extrasAcknowledged) {
          return { kind: "extras_acknowledgement_required" } as const;
        }

        const claimed = await transaction.delivery.updateMany({
          where: {
            id: deliveryId,
            status: "SEARCHING_MOTOBOY",
            motoboyId: null,
            expiresAt: { gt: now },
          },
          data: {
            motoboyId: motoboy.id,
            activeMotoboyKey: motoboy.id,
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });
        if (claimed.count !== 1) return { kind: "unavailable" } as const;
        if (candidate.extras.length > 0) {
          await transaction.deliveryExtra.updateMany({
            where: {
              id: { in: candidate.extras.map((extra) => extra.id) },
              status: "PENDING",
            },
            data: { status: "ACKNOWLEDGED" },
          });
          await transaction.deliveryExtraHistory.createMany({
            data: candidate.extras.map((extra) => ({
              extraId: extra.id,
              previousStatus: "PENDING" as const,
              newStatus: "ACKNOWLEDGED" as const,
              action: "ACKNOWLEDGED" as const,
              actorUserId: userId,
              actorRole: "MOTOBOY" as const,
              note: "Condições confirmadas no aceite da oportunidade.",
              createdAt: now,
            })),
          });
        }
        await transaction.deliveryStatusHistory.create({
          data: {
            deliveryId,
            previousStatus: "SEARCHING_MOTOBOY",
            newStatus: "ACCEPTED",
            actorUserId: userId,
            actorRole: "MOTOBOY",
          },
        });
        const delivery = await transaction.delivery.findUniqueOrThrow({
          where: { id: deliveryId },
          select: deliverySelect,
        });
        return { kind: "accepted", delivery: toRecord(delivery) } as const;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { kind: "unavailable" } as const;
      }
      throw error;
    }
  },

  async getCurrentDeliveryForMotoboy(userId) {
    const profile = await getPrisma().motoboyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    const delivery = await getPrisma().delivery.findFirst({
      where: {
        motoboyId: profile.id,
        status: {
          in: [
            "ACCEPTED",
            "MOTOBOY_TO_PICKUP",
            "ARRIVED_AT_PICKUP",
            "PICKED_UP",
            "IN_DELIVERY",
          ],
        },
      },
      orderBy: { acceptedAt: "desc" },
      select: deliverySelect,
    });
    return delivery ? toRecord(delivery) : null;
  },

  async getDeliveryForActor(userId, role, deliveryId) {
    const profile =
      role === "COMPANY"
        ? await getPrisma().companyProfile.findUnique({
            where: { userId },
            select: { id: true },
          })
        : await getPrisma().motoboyProfile.findUnique({
            where: { userId },
            select: { id: true },
          });
    if (!profile) return "forbidden";
    const delivery = await getPrisma().delivery.findUnique({
      where: { id: deliveryId },
      select: deliverySelect,
    });
    if (!delivery) return null;
    const ownsDelivery =
      role === "COMPANY"
        ? delivery.companyId === profile.id
        : delivery.motoboyId === profile.id;
    return ownsDelivery ? toRecord(delivery) : "forbidden";
  },

  async transitionDeliveryAtomically(
    userId,
    deliveryId,
    expectedStatus,
    newStatus,
    note,
    now,
  ) {
    return getPrisma().$transaction(async (transaction) => {
      const motoboy = await transaction.motoboyProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!motoboy) return { kind: "forbidden" } as const;
      const candidate = await transaction.delivery.findUnique({
        where: { id: deliveryId },
        select: { motoboyId: true, status: true },
      });
      if (!candidate) return { kind: "not_found" } as const;
      if (candidate.motoboyId !== motoboy.id) {
        return { kind: "forbidden" } as const;
      }
      if (candidate.status !== expectedStatus) {
        return { kind: "conflict" } as const;
      }
      const updated = await transaction.delivery.updateMany({
        where: {
          id: deliveryId,
          motoboyId: motoboy.id,
          status: expectedStatus,
        },
        data: {
          status: newStatus,
          ...(newStatus === "PICKED_UP" ? { pickedUpAt: now } : {}),
          ...(newStatus === "COMPLETED"
            ? { completedAt: now, activeMotoboyKey: null }
            : {}),
        },
      });
      if (updated.count !== 1) return { kind: "conflict" } as const;
      await transaction.deliveryStatusHistory.create({
        data: {
          deliveryId,
          previousStatus: expectedStatus,
          newStatus,
          actorUserId: userId,
          actorRole: "MOTOBOY",
          note,
          createdAt: now,
        },
      });
      const delivery = await transaction.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
        select: deliverySelect,
      });
      return { kind: "updated", delivery: toRecord(delivery) } as const;
    });
  },

  async cancelDeliveryAtomically(
    userId,
    role,
    deliveryId,
    allowedStatuses,
    newStatus,
    reason,
    now,
  ) {
    return getPrisma().$transaction(async (transaction) => {
      const profile =
        role === "COMPANY"
          ? await transaction.companyProfile.findUnique({
              where: { userId },
              select: { id: true },
            })
          : await transaction.motoboyProfile.findUnique({
              where: { userId },
              select: { id: true },
            });
      if (!profile) return { kind: "forbidden" } as const;
      const candidate = await transaction.delivery.findUnique({
        where: { id: deliveryId },
        select: { companyId: true, motoboyId: true, status: true },
      });
      if (!candidate) return { kind: "not_found" } as const;
      const ownsDelivery =
        role === "COMPANY"
          ? candidate.companyId === profile.id
          : candidate.motoboyId === profile.id;
      if (!ownsDelivery) return { kind: "forbidden" } as const;
      if (!allowedStatuses.includes(candidate.status)) {
        return { kind: "conflict" } as const;
      }
      const updated = await transaction.delivery.updateMany({
        where: { id: deliveryId, status: candidate.status },
        data: { status: newStatus, cancelledAt: now, activeMotoboyKey: null },
      });
      if (updated.count !== 1) return { kind: "conflict" } as const;
      await transaction.deliveryStatusHistory.create({
        data: {
          deliveryId,
          previousStatus: candidate.status,
          newStatus,
          actorUserId: userId,
          actorRole: role,
          note: reason,
          createdAt: now,
        },
      });
      const delivery = await transaction.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
        select: deliverySelect,
      });
      return { kind: "updated", delivery: toRecord(delivery) } as const;
    });
  },

  async listDeliveryHistory(userId, role, filters) {
    const profile =
      role === "COMPANY"
        ? await getPrisma().companyProfile.findUnique({
            where: { userId },
            select: { id: true },
          })
        : await getPrisma().motoboyProfile.findUnique({
            where: { userId },
            select: { id: true },
          });
    if (!profile) return null;
    const defaultStatuses: DeliveryStatus[] = [
      "COMPLETED",
      "CANCELLED_BY_COMPANY",
      "CANCELLED_BY_MOTOBOY",
    ];
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;
    const deliveries = await getPrisma().delivery.findMany({
      where: {
        ...(role === "COMPANY"
          ? { companyId: profile.id }
          : { motoboyId: profile.id }),
        status: filters.status ? filters.status : { in: defaultStatuses },
        createdAt:
          filters.from || to
            ? {
                ...(filters.from
                  ? { gte: new Date(`${filters.from}T00:00:00.000Z`) }
                  : {}),
                ...(to ? { lte: to } : {}),
              }
            : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: deliverySelect,
    });
    return deliveries.map((delivery) => toRecord(delivery));
  },
};
