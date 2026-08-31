import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { isMotoboyEffectivelyOnline } from "@/server/presence/presence-service";

import type { CompanyHistoryRepository } from "./company-history-service";

function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
}

const historySelect = {
  id: true,
  motoboyId: true,
  pickupAddress: true,
  pickupNumber: true,
  pickupNeighborhood: true,
  pickupCity: true,
  pickupState: true,
  destinationAddress: true,
  destinationNumber: true,
  destinationNeighborhood: true,
  destinationCity: true,
  destinationState: true,
  distanceEstimateKm: true,
  distanceMethod: true,
  suggestedPrice: true,
  offeredPrice: true,
  paymentMethod: true,
  status: true,
  acceptedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  motoboy: { select: { user: { select: { name: true } } } },
  ratings: {
    select: { reviewerRole: true, score: true },
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
    },
  },
} satisfies Prisma.DeliverySelect;

function toHistoryItem(delivery: {
  id: string;
  motoboyId: string | null;
  pickupAddress: string;
  pickupNumber: string;
  pickupNeighborhood: string;
  pickupCity: string;
  pickupState: string;
  destinationAddress: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationCity: string;
  destinationState: string;
  distanceEstimateKm: { toNumber(): number };
  distanceMethod: "STRAIGHT_LINE";
  suggestedPrice: { toNumber(): number } | null;
  offeredPrice: { toNumber(): number };
  paymentMethod: string;
  status: string;
  acceptedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  motoboy: { user: { name: string } } | null;
  ratings: Array<{ reviewerRole: string; score: number }>;
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
    informedByRole: "COMPANY" | "MOTOBOY" | "ADMIN";
    status: "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
    note: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    ...delivery,
    motoboyName: delivery.motoboy?.user.name ?? null,
    distanceEstimateKm: delivery.distanceEstimateKm.toNumber(),
    suggestedPrice: delivery.suggestedPrice?.toNumber() ?? null,
    offeredPrice: delivery.offeredPrice.toNumber(),
    companyRating:
      delivery.ratings.find((rating) => rating.reviewerRole === "COMPANY")
        ?.score ?? null,
    motoboyRating:
      delivery.ratings.find((rating) => rating.reviewerRole === "MOTOBOY")
        ?.score ?? null,
    acceptedAt: delivery.acceptedAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    cancelledAt: delivery.cancelledAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    motoboy: undefined,
    ratings: undefined,
    extras: delivery.extras.map((extra) => ({
      ...extra,
      amount: extra.amount?.toNumber() ?? null,
      createdAt: extra.createdAt.toISOString(),
    })),
  };
}

async function companyProfile(userId: string) {
  return getPrisma().companyProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export const prismaCompanyHistoryRepository: CompanyHistoryRepository = {
  async listHistory(userId, query) {
    const company = await companyProfile(userId);
    if (!company)
      return {
        items: [],
        pagination: pagination(query.page, query.pageSize, 0),
        motoboys: [],
      };
    const where: Prisma.DeliveryWhereInput = {
      companyId: company.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.motoboyId ? { motoboyId: query.motoboyId } : {}),
      ...(query.city
        ? { OR: [{ pickupCity: query.city }, { destinationCity: query.city }] }
        : {}),
      ...(query.from || query.to
        ? { createdAt: dateRange(query.from, query.to) }
        : {}),
      ...(query.query
        ? {
            AND: [
              {
                OR: [
                  {
                    pickupAddress: {
                      contains: query.query,
                    },
                  },
                  {
                    pickupNeighborhood: {
                      contains: query.query,
                    },
                  },
                  {
                    destinationAddress: {
                      contains: query.query,
                    },
                  },
                  {
                    destinationNeighborhood: {
                      contains: query.query,
                    },
                  },
                  {
                    motoboy: {
                      user: {
                        name: { contains: query.query },
                      },
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };
    const [total, items, motoboys] = await Promise.all([
      getPrisma().delivery.count({ where }),
      getPrisma().delivery.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: historySelect,
      }),
      getPrisma().motoboyProfile.findMany({
        where: { deliveries: { some: { companyId: company.id } } },
        orderBy: { user: { name: "asc" } },
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);
    return {
      items: items.map(toHistoryItem),
      pagination: pagination(query.page, query.pageSize, total),
      motoboys: motoboys.map((item) => ({ id: item.id, name: item.user.name })),
    };
  },

  async getHistoryDetail(userId, deliveryId) {
    const delivery = await getPrisma().delivery.findFirst({
      where: { id: deliveryId, company: { userId } },
      select: {
        ...historySelect,
        notes: true,
        destinationComplement: true,
        destinationReference: true,
        pickedUpAt: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            previousStatus: true,
            newStatus: true,
            actorRole: true,
            note: true,
            createdAt: true,
          },
        },
        reports: {
          where: { reporterUserId: userId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            category: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!delivery) return null;
    return {
      ...toHistoryItem(delivery),
      notes: delivery.notes,
      destinationComplement: delivery.destinationComplement,
      destinationReference: delivery.destinationReference,
      pickedUpAt: delivery.pickedUpAt?.toISOString() ?? null,
      timeline: delivery.statusHistory.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      reports: delivery.reports.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  },

  async getRepeatDraft(userId, deliveryId) {
    const delivery = await getPrisma().delivery.findFirst({
      where: { id: deliveryId, company: { userId } },
      select: {
        id: true,
        pickupAddress: true,
        pickupNumber: true,
        pickupNeighborhood: true,
        destinationAddress: true,
        destinationNumber: true,
        destinationNeighborhood: true,
        destinationComplement: true,
        destinationReference: true,
        destinationCity: true,
        destinationState: true,
        destinationPostalCode: true,
        destinationLatitude: true,
        destinationLongitude: true,
        offeredPrice: true,
        paymentMethod: true,
        notes: true,
        extras: {
          where: { status: { notIn: ["REJECTED", "CANCELLED"] } },
          orderBy: { createdAt: "asc" },
          select: {
            type: true,
            description: true,
            amount: true,
            note: true,
          },
        },
      },
    });
    if (!delivery) return null;
    return {
      ...delivery,
      destinationLatitude: delivery.destinationLatitude.toNumber(),
      destinationLongitude: delivery.destinationLongitude.toNumber(),
      offeredPrice: delivery.offeredPrice.toNumber(),
      extras: delivery.extras.map((extra) => ({
        ...extra,
        amount: extra.amount?.toNumber() ?? null,
      })),
    };
  },

  async listMotoboys(userId, query, now, ttlMinutes) {
    const company = await companyProfile(userId);
    if (!company)
      return {
        items: [],
        pagination: pagination(query.page, query.pageSize, 0),
      };
    const where: Prisma.MotoboyProfileWhereInput = {
      deliveries: { some: { companyId: company.id, status: "COMPLETED" } },
      ...(query.query ? { user: { name: { contains: query.query } } } : {}),
      ...(query.favoritesOnly
        ? { favoritedBy: { some: { companyId: company.id } } }
        : {}),
    };
    const [total, motoboys] = await Promise.all([
      getPrisma().motoboyProfile.count({ where }),
      getPrisma().motoboyProfile.findMany({
        where,
        orderBy: { user: { name: "asc" } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          userId: true,
          isOnline: true,
          lastLocationAt: true,
          user: { select: { name: true } },
          favoritedBy: {
            where: { companyId: company.id },
            take: 1,
            select: { id: true },
          },
          deliveries: {
            where: { companyId: company.id, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { id: true, completedAt: true, createdAt: true },
          },
        },
      }),
    ]);
    const ids = motoboys.map((item) => item.id);
    const userIds = motoboys.map((item) => item.userId);
    const [counts, ratings] = await Promise.all([
      getPrisma().delivery.groupBy({
        by: ["motoboyId"],
        where: {
          companyId: company.id,
          motoboyId: { in: ids },
          status: "COMPLETED",
        },
        _count: { _all: true },
      }),
      getPrisma().rating.groupBy({
        by: ["reviewedUserId"],
        where: { reviewedUserId: { in: userIds } },
        _avg: { score: true },
        _count: { _all: true },
      }),
    ]);
    const countById = new Map(
      counts.map((item) => [item.motoboyId, item._count._all]),
    );
    const ratingByUser = new Map(
      ratings.map((item) => [item.reviewedUserId, item]),
    );
    return {
      items: motoboys.map((motoboy) => {
        const rating = ratingByUser.get(motoboy.userId);
        const last = motoboy.deliveries[0];
        return {
          id: motoboy.id,
          name: motoboy.user.name,
          ratingAverage:
            rating?._avg.score === null || rating?._avg.score === undefined
              ? null
              : Math.round(rating._avg.score * 10) / 10,
          ratingCount: rating?._count._all ?? 0,
          completedWithCompany: countById.get(motoboy.id) ?? 0,
          lastDeliveryAt:
            (last?.completedAt ?? last?.createdAt)?.toISOString() ?? null,
          lastCompletedDeliveryId: last?.id ?? null,
          favoriteId: motoboy.favoritedBy[0]?.id ?? null,
          isOnline: isMotoboyEffectivelyOnline(motoboy, now, ttlMinutes),
        };
      }),
      pagination: pagination(query.page, query.pageSize, total),
    };
  },

  async getMotoboyRelationship(userId, motoboyId, query) {
    const company = await companyProfile(userId);
    if (!company) return null;
    const established = await getPrisma().delivery.findFirst({
      where: { companyId: company.id, motoboyId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });
    if (!established) return null;
    const where: Prisma.DeliveryWhereInput = {
      companyId: company.id,
      motoboyId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [motoboy, total, items] = await Promise.all([
      getPrisma().motoboyProfile.findUnique({
        where: { id: motoboyId },
        select: {
          userId: true,
          user: { select: { name: true } },
          favoritedBy: {
            where: { companyId: company.id },
            take: 1,
            select: { id: true },
          },
        },
      }),
      getPrisma().delivery.count({ where }),
      getPrisma().delivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: historySelect,
      }),
    ]);
    if (!motoboy) return null;
    const rating = await getPrisma().rating.aggregate({
      where: { reviewedUserId: motoboy.userId },
      _avg: { score: true },
      _count: { _all: true },
    });
    return {
      motoboy: {
        id: motoboyId,
        name: motoboy.user.name,
        favoriteId: motoboy.favoritedBy[0]?.id ?? null,
        ratingAverage:
          rating._avg.score === null
            ? null
            : Math.round(rating._avg.score * 10) / 10,
        ratingCount: rating._count._all,
        lastCompletedDeliveryId: established.id,
      },
      items: items.map(toHistoryItem),
      pagination: pagination(query.page, query.pageSize, total),
    };
  },
};
