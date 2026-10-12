import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { EarningsRepository } from "./earnings-service";

export const prismaEarningsRepository: EarningsRepository = {
  async getMotoboyEarnings(userId, since) {
    const profile = await getPrisma().motoboyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;

    const where = {
      motoboyId: profile.id,
      status: "COMPLETED" as const,
      ...(since ? { completedAt: { gte: since } } : {}),
    };
    const [groups, deliveries] = await Promise.all([
      getPrisma().delivery.groupBy({
        by: ["paymentStatus"],
        where,
        _sum: { offeredPrice: true },
        _count: { _all: true },
      }),
      getPrisma().delivery.findMany({
        where,
        orderBy: { completedAt: "desc" },
        take: 50,
        select: {
          id: true,
          offeredPrice: true,
          paymentMethod: true,
          paymentStatus: true,
          completedAt: true,
          company: { select: { fantasyName: true } },
        },
      }),
    ]);

    return {
      groups: groups.map((group) => ({
        paymentStatus: group.paymentStatus,
        amount: group._sum.offeredPrice?.toNumber() ?? 0,
        count: group._count._all,
      })),
      deliveries: deliveries.flatMap((delivery) =>
        delivery.completedAt
          ? [
              {
                id: delivery.id,
                companyName: delivery.company.fantasyName,
                offeredPrice: delivery.offeredPrice.toNumber(),
                paymentMethod: delivery.paymentMethod,
                paymentStatus: delivery.paymentStatus,
                completedAt: delivery.completedAt.toISOString(),
              },
            ]
          : [],
      ),
    };
  },
};
