import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import type {
  PreRegistrationFilters,
  PreRegistrationRepository,
} from "./types";

const select = {
  id: true,
  name: true,
  phone: true,
  normalizedPhone: true,
  type: true,
  consentNoticeVersion: true,
  consentRecordedAt: true,
  createdAt: true,
} as const;

function where(filters: Omit<PreRegistrationFilters, "page" | "pageSize">) {
  const digits = filters.query?.replace(/\D/g, "");
  return {
    type: filters.type,
    createdAt:
      filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined,
    OR: filters.query
      ? [
          { name: { contains: filters.query } },
          { phone: { contains: filters.query } },
          ...(digits ? [{ normalizedPhone: { contains: digits } }] : []),
        ]
      : undefined,
  };
}

export const prismaPreRegistrationRepository: PreRegistrationRepository = {
  async createOrFind(input) {
    const prisma = getPrisma();
    try {
      const record = await prisma.preRegistration.create({
        data: {
          name: input.name,
          phone: input.phone,
          normalizedPhone: input.normalizedPhone,
          type: input.type,
          consentNoticeVersion: input.consentNoticeVersion,
          consentRecordedAt: input.now,
          createdAt: input.now,
        },
        select,
      });
      return { record, created: true };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
      const record = await prisma.preRegistration.findUniqueOrThrow({
        where: {
          normalizedPhone_type: {
            normalizedPhone: input.normalizedPhone,
            type: input.type,
          },
        },
        select,
      });
      return { record, created: false };
    }
  },
  async metrics() {
    const prisma = getPrisma();
    const [total, grouped] = await Promise.all([
      prisma.preRegistration.count(),
      prisma.preRegistration.groupBy({ by: ["type"], _count: { _all: true } }),
    ]);
    const counts = new Map(
      grouped.map((item) => [item.type, item._count._all]),
    );
    return {
      total,
      motoboys: counts.get("MOTOBOY") ?? 0,
      companies: counts.get("COMPANY") ?? 0,
    };
  },
  async list(filters) {
    const prisma = getPrisma();
    const criteria = where(filters);
    const [items, total] = await Promise.all([
      prisma.preRegistration.findMany({
        where: criteria,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select,
      }),
      prisma.preRegistration.count({ where: criteria }),
    ]);
    return { items, total };
  },
  exportRows(filters, limit) {
    return getPrisma().preRegistration.findMany({
      where: where(filters),
      orderBy: { createdAt: "desc" },
      take: limit,
      select,
    });
  },
};
