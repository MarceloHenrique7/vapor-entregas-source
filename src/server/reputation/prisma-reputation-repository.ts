import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import type { ReputationRepository } from "./reputation-service";
import type { FavoriteRecord, ReportView } from "./types";

async function getFavoriteRecord(id: string): Promise<FavoriteRecord> {
  const prisma = getPrisma();
  const favorite = await prisma.favorite.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      motoboyId: true,
      createdAt: true,
      motoboy: {
        select: {
          userId: true,
          isOnline: true,
          lastLocationAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  const [rating, completedDeliveries] = await Promise.all([
    prisma.rating.aggregate({
      where: { reviewedUserId: favorite.motoboy.userId },
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.delivery.count({
      where: { motoboyId: favorite.motoboyId, status: "COMPLETED" },
    }),
  ]);
  return {
    id: favorite.id,
    motoboyId: favorite.motoboyId,
    motoboyUserId: favorite.motoboy.userId,
    name: favorite.motoboy.user.name,
    ratingAverage: rating._avg.score,
    ratingCount: rating._count._all,
    completedDeliveries,
    isOnline: favorite.motoboy.isOnline,
    lastLocationAt: favorite.motoboy.lastLocationAt,
    createdAt: favorite.createdAt.toISOString(),
  };
}

function toReportView(report: {
  id: string;
  deliveryId: string | null;
  category:
    | "USER_NO_SHOW"
    | "FRAUD_ATTEMPT"
    | "INAPPROPRIATE_BEHAVIOR"
    | "PAYMENT_PROBLEM"
    | "THREAT"
    | "ACCIDENT"
    | "IRREGULAR_ORDER"
    | "OTHER";
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: Date;
  updatedAt: Date;
}): ReportView {
  return {
    ...report,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export const prismaReputationRepository: ReputationRepository = {
  async getDeliveryParticipants(deliveryId) {
    const delivery = await getPrisma().delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        status: true,
        companyId: true,
        motoboyId: true,
        company: {
          select: {
            fantasyName: true,
            userId: true,
          },
        },
        motoboy: {
          select: {
            userId: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!delivery) return null;
    return {
      deliveryId: delivery.id,
      status: delivery.status,
      companyUserId: delivery.company.userId,
      companyName: delivery.company.fantasyName,
      motoboyUserId: delivery.motoboy?.userId ?? null,
      motoboyName: delivery.motoboy?.user.name ?? null,
      companyProfileId: delivery.companyId,
      motoboyProfileId: delivery.motoboyId,
    };
  },

  async createRating(data) {
    try {
      const rating = await getPrisma().rating.create({
        data: {
          deliveryId: data.deliveryId,
          reviewerUserId: data.reviewerUserId,
          reviewedUserId: data.reviewedUserId,
          reviewerRole: data.reviewerRole,
          score: data.score,
          comment: data.comment,
          createdAt: data.now,
        },
        select: {
          id: true,
          deliveryId: true,
          score: true,
          comment: true,
          createdAt: true,
          reviewed: { select: { name: true } },
        },
      });
      return {
        kind: "created",
        rating: {
          id: rating.id,
          deliveryId: rating.deliveryId,
          score: rating.score,
          comment: rating.comment,
          reviewedName: rating.reviewed.name,
          createdAt: rating.createdAt.toISOString(),
        },
      } as const;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { kind: "duplicate" } as const;
      }
      throw error;
    }
  },

  async getRatingOverview(userId, role) {
    const prisma = getPrisma();
    const [received, given, completed] = await Promise.all([
      prisma.rating.aggregate({
        where: { reviewedUserId: userId },
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.rating.findMany({
        where: { reviewerUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          deliveryId: true,
          score: true,
          comment: true,
          createdAt: true,
          reviewed: { select: { name: true } },
        },
      }),
      prisma.delivery.findMany({
        where: {
          status: "COMPLETED",
          ...(role === "COMPANY"
            ? { company: { userId } }
            : { motoboy: { userId } }),
        },
        orderBy: { completedAt: "desc" },
        take: 100,
        select: {
          id: true,
          company: { select: { fantasyName: true, userId: true } },
          motoboy: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    const completedWithCounterparty = completed
      .map((delivery) => ({
        delivery,
        userId:
          role === "COMPANY"
            ? delivery.motoboy?.userId
            : delivery.company.userId,
        name:
          role === "COMPANY"
            ? delivery.motoboy?.user.name
            : delivery.company.fantasyName,
      }))
      .filter((item): item is typeof item & { userId: string; name: string } =>
        Boolean(item.userId && item.name),
      );
    const aggregates = await prisma.rating.groupBy({
      by: ["reviewedUserId"],
      where: {
        reviewedUserId: {
          in: [
            ...new Set(completedWithCounterparty.map((item) => item.userId)),
          ],
        },
      },
      _avg: { score: true },
      _count: { _all: true },
    });
    const aggregateByUser = new Map(
      aggregates.map((aggregate) => [aggregate.reviewedUserId, aggregate]),
    );
    const ratedDeliveries = new Set(given.map((rating) => rating.deliveryId));
    return {
      received: {
        average: received._avg.score,
        count: received._count._all,
      },
      given: given.map((rating) => ({
        id: rating.id,
        deliveryId: rating.deliveryId,
        score: rating.score,
        comment: rating.comment,
        reviewedName: rating.reviewed.name,
        createdAt: rating.createdAt.toISOString(),
      })),
      pending: completedWithCounterparty
        .filter((item) => !ratedDeliveries.has(item.delivery.id))
        .map((item) => ({
          deliveryId: item.delivery.id,
          reviewedName: item.name,
        })),
      counterparties: Object.fromEntries(
        completedWithCounterparty.map((item) => {
          const aggregate = aggregateByUser.get(item.userId);
          return [
            item.delivery.id,
            {
              name: item.name,
              average: aggregate?._avg.score ?? null,
              count: aggregate?._count._all ?? 0,
            },
          ];
        }),
      ),
    };
  },

  async createFavorite(data) {
    try {
      const favorite = await getPrisma().favorite.create({
        data: {
          companyId: data.companyProfileId,
          motoboyId: data.motoboyProfileId,
          createdAt: data.now,
        },
        select: { id: true },
      });
      return {
        kind: "created",
        favorite: await getFavoriteRecord(favorite.id),
      } as const;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { kind: "duplicate" } as const;
      }
      throw error;
    }
  },

  async removeFavorite(companyUserId, favoriteId) {
    const favorite = await getPrisma().favorite.findFirst({
      where: { id: favoriteId, company: { userId: companyUserId } },
      select: { id: true },
    });
    if (!favorite) return false;
    await getPrisma().favorite.delete({ where: { id: favorite.id } });
    return true;
  },

  async listFavorites(companyUserId) {
    const prisma = getPrisma();
    const company = await prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: {
        favorites: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            motoboyId: true,
            createdAt: true,
            motoboy: {
              select: {
                userId: true,
                isOnline: true,
                lastLocationAt: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!company) return null;
    const [ratings, deliveries] = await Promise.all([
      prisma.rating.groupBy({
        by: ["reviewedUserId"],
        where: {
          reviewedUserId: {
            in: company.favorites.map((favorite) => favorite.motoboy.userId),
          },
        },
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.delivery.groupBy({
        by: ["motoboyId"],
        where: {
          motoboyId: {
            in: company.favorites.map((favorite) => favorite.motoboyId),
          },
          status: "COMPLETED",
        },
        _count: { _all: true },
      }),
    ]);
    const ratingByUser = new Map(
      ratings.map((rating) => [rating.reviewedUserId, rating]),
    );
    const deliveriesByMotoboy = new Map(
      deliveries.map((delivery) => [delivery.motoboyId, delivery._count._all]),
    );
    return company.favorites.map((favorite) => {
      const rating = ratingByUser.get(favorite.motoboy.userId);
      return {
        id: favorite.id,
        motoboyId: favorite.motoboyId,
        motoboyUserId: favorite.motoboy.userId,
        name: favorite.motoboy.user.name,
        ratingAverage: rating?._avg.score ?? null,
        ratingCount: rating?._count._all ?? 0,
        completedDeliveries: deliveriesByMotoboy.get(favorite.motoboyId) ?? 0,
        isOnline: favorite.motoboy.isOnline,
        lastLocationAt: favorite.motoboy.lastLocationAt,
        createdAt: favorite.createdAt.toISOString(),
      };
    });
  },

  async createReport(data) {
    try {
      const report = await getPrisma().report.create({
        data: {
          reporterUserId: data.reporterUserId,
          reportedUserId: data.reportedUserId,
          deliveryId: data.deliveryId,
          category: data.category,
          description: data.description,
          fingerprint: data.fingerprint,
          status: "OPEN",
          createdAt: data.now,
          updatedAt: data.now,
        },
        select: {
          id: true,
          deliveryId: true,
          category: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return { kind: "created", report: toReportView(report) } as const;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { kind: "duplicate" } as const;
      }
      throw error;
    }
  },

  async listReports(reporterUserId) {
    const reports = await getPrisma().report.findMany({
      where: { reporterUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        deliveryId: true,
        category: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return reports.map(toReportView);
  },
};
