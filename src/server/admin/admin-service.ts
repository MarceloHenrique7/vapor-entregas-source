import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPresenceEnv, getSensitiveDataEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { fingerprintPrivateField } from "@/server/security/private-fields";

import { AdminActionConflictError, AdminResourceNotFoundError } from "./errors";
import {
  administrativeActionForStatus,
  assertAdminAccess,
  assertModerationTarget,
  canTransitionReport,
} from "./policy";
import {
  adminIdSchema,
  adminDashboardSearchSchema,
  auditSearchSchema,
  companyProActionSchema,
  deliverySearchSchema,
  reportSearchSchema,
  reportStatusActionSchema,
  userSearchSchema,
  userStatusActionSchema,
  motoboyPlanActionSchema,
} from "./schemas";
import type {
  AdminActor,
  AdminAuditItem,
  AdminDashboardMetrics,
  AdminDeliveryDetail,
  AdminDeliveryListItem,
  AdminReportListItem,
  AdminUserDetail,
  AdminUserListItem,
  Paginated,
} from "./types";

const prisma = getPrisma();

function pageResult<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function startOfDay(now: Date) {
  const value = new Date(now);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

function dateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const end = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  return {
    gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    lte: end,
  };
}

function cityFromUser(user: {
  motoboyProfile: { city: string } | null;
  companyProfile: { city: string } | null;
}) {
  return user.motoboyProfile?.city ?? user.companyProfile?.city ?? null;
}

export async function getAdminDashboard(
  actor: AdminActor,
  raw: unknown = {},
  now = new Date(),
): Promise<AdminDashboardMetrics> {
  assertAdminAccess(actor);
  const input = adminDashboardSearchSchema.parse(raw);
  const periodStart = (() => {
    if (input.period === "today") return startOfDay(now);
    if (input.period === "7d")
      return startOfDay(new Date(now.getTime() - 6 * 86_400_000));
    if (input.period === "30d")
      return startOfDay(new Date(now.getTime() - 29 * 86_400_000));
    if (input.period === "month")
      return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(`${input.from}T00:00:00.000Z`);
  })();
  const periodEnd =
    input.period === "custom" ? new Date(`${input.to}T23:59:59.999Z`) : now;
  const periodFilter = { gte: periodStart, lte: periodEnd };
  const cutoff = new Date(
    now.getTime() - getPresenceEnv().ONLINE_PRESENCE_TTL_MINUTES * 60_000,
  );
  const [
    totalUsers,
    totalMotoboys,
    totalCompanies,
    motoboysOnline,
    deliveriesCreated,
    deliveriesToday,
    deliveriesCompleted,
    deliveriesSearching,
    deliveriesCancelled,
    deliveriesDisputed,
    reportsOpen,
    reportsUnderReview,
    rating,
    paidActiveGroups,
    manualActiveGroups,
    paidHistoryGroups,
    manualHistoryGroups,
    companiesPro,
    vaporPayPending,
    vaporPayDisputed,
    vaporPayPendingValue,
    recentRegistrations,
    paidExpiringGroups,
    manualExpiringGroups,
    confirmedRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "MOTOBOY" } }),
    prisma.user.count({ where: { role: "COMPANY" } }),
    prisma.motoboyProfile.count({
      where: {
        isOnline: true,
        lastLocationAt: { gte: cutoff },
        user: { status: "ACTIVE" },
      },
    }),
    prisma.delivery.count({ where: { createdAt: periodFilter } }),
    prisma.delivery.count({ where: { createdAt: { gte: startOfDay(now) } } }),
    prisma.delivery.count({ where: { status: "COMPLETED" } }),
    prisma.delivery.count({ where: { status: "SEARCHING_MOTOBOY" } }),
    prisma.delivery.count({
      where: {
        status: { in: ["CANCELLED_BY_COMPANY", "CANCELLED_BY_MOTOBOY"] },
      },
    }),
    prisma.delivery.count({ where: { status: "DISPUTED" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.report.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.rating.aggregate({ _avg: { score: true } }),
    prisma.subscription.groupBy({
      by: ["userId"],
      where: {
        user: { role: "MOTOBOY" },
        status: { in: ["TRIAL", "ACTIVE"] },
        currentPeriodEnd: { gt: now },
      },
    }),
    prisma.manualAccessGrant.groupBy({
      by: ["userId"],
      where: {
        user: { role: "MOTOBOY" },
        revokedAt: null,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
    }),
    prisma.subscription.groupBy({
      by: ["userId"],
      where: { user: { role: "MOTOBOY" } },
    }),
    prisma.manualAccessGrant.groupBy({
      by: ["userId"],
      where: { user: { role: "MOTOBOY" } },
    }),
    prisma.companyProfile.count({
      where: {
        proEnabled: true,
        OR: [{ proExpiresAt: null }, { proExpiresAt: { gt: now } }],
      },
    }),
    prisma.delivery.count({
      where: { paymentStatus: { in: ["PENDING", "REPORTED_PAID"] } },
    }),
    prisma.delivery.count({ where: { paymentStatus: "DISPUTED" } }),
    prisma.delivery.aggregate({
      where: { paymentStatus: { in: ["PENDING", "REPORTED_PAID"] } },
      _sum: { offeredPrice: true },
    }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
    }),
    prisma.subscription.groupBy({
      by: ["userId"],
      where: {
        status: { in: ["TRIAL", "ACTIVE"] },
        currentPeriodEnd: {
          gt: now,
          lte: new Date(now.getTime() + 7 * 86_400_000),
        },
      },
    }),
    prisma.manualAccessGrant.groupBy({
      by: ["userId"],
      where: {
        revokedAt: null,
        endsAt: { gt: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
      },
    }),
    prisma.subscriptionPayment.aggregate({
      where: {
        status: { in: ["APPROVED", "approved"] },
        createdAt: periodFilter,
      },
      _sum: { amount: true },
    }),
  ]);
  const activeMotoboyIds = new Set([
    ...paidActiveGroups.map((item) => item.userId),
    ...manualActiveGroups.map((item) => item.userId),
  ]);
  const historyMotoboyIds = new Set([
    ...paidHistoryGroups.map((item) => item.userId),
    ...manualHistoryGroups.map((item) => item.userId),
  ]);
  const motoboysExpired = [...historyMotoboyIds].filter(
    (id) => !activeMotoboyIds.has(id),
  ).length;
  const expiringIds = new Set([
    ...paidExpiringGroups.map((item) => item.userId),
    ...manualExpiringGroups.map((item) => item.userId),
  ]);
  return {
    totalUsers,
    totalMotoboys,
    totalCompanies,
    motoboysOnline,
    deliveriesCreated,
    deliveriesToday,
    deliveriesCompleted,
    deliveriesSearching,
    deliveriesCancelled,
    deliveriesDisputed,
    reportsOpen,
    reportsUnderReview,
    overallRatingAverage: rating._avg.score,
    motoboysActivePlan: activeMotoboyIds.size,
    motoboysExpired,
    motoboysWithoutPlan: Math.max(
      0,
      totalMotoboys - activeMotoboyIds.size - motoboysExpired,
    ),
    companiesFree: Math.max(0, totalCompanies - companiesPro),
    companiesPro,
    vaporPayPending,
    vaporPayDisputed,
    vaporPayPendingValue: Number(vaporPayPendingValue._sum.offeredPrice ?? 0),
    recentRegistrations,
    expiringAccess: expiringIds.size,
    confirmedRevenue: Number(confirmedRevenue._sum.amount ?? 0),
    periodLabel: input.period,
  };
}

export async function listAdminUsers(
  actor: AdminActor,
  raw: unknown,
): Promise<Paginated<AdminUserListItem>> {
  assertAdminAccess(actor);
  const input = userSearchSchema.parse(raw);
  const digits = input.query.replace(/\D/g, "");
  const documentHash = [11, 14].includes(digits.length)
    ? fingerprintPrivateField(
        digits,
        getSensitiveDataEnv().FIELD_ENCRYPTION_KEY,
      )
    : null;
  const where: Prisma.UserWhereInput = {
    role: input.role,
    status: input.status,
    ...(input.city
      ? {
          OR: [
            { motoboyProfile: { city: input.city } },
            { companyProfile: { city: input.city } },
          ],
        }
      : {}),
    ...(input.query
      ? {
          AND: [
            {
              OR: [
                { name: { contains: input.query } },
                { email: { contains: input.query } },
                ...(documentHash
                  ? [
                      { motoboyProfile: { cpfHash: documentHash } },
                      { companyProfile: { legalDocumentHash: documentHash } },
                    ]
                  : []),
              ],
            },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        motoboyProfile: {
          select: { city: true, _count: { select: { deliveries: true } } },
        },
        companyProfile: {
          select: { city: true, _count: { select: { deliveries: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const ratingGroups = users.length
    ? await prisma.rating.groupBy({
        by: ["reviewedUserId"],
        where: { reviewedUserId: { in: users.map((user) => user.id) } },
        _avg: { score: true },
        _count: { _all: true },
      })
    : [];
  const ratings = new Map(
    ratingGroups.map((item) => [item.reviewedUserId, item]),
  );
  return pageResult(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      city: cityFromUser(user),
      createdAt: user.createdAt.toISOString(),
      relatedDeliveries:
        user.motoboyProfile?._count.deliveries ??
        user.companyProfile?._count.deliveries ??
        0,
      ratingAverage: ratings.get(user.id)?._avg.score ?? null,
      ratingCount: ratings.get(user.id)?._count._all ?? 0,
    })),
    input.page,
    input.pageSize,
    total,
  );
}

export async function getAdminUser(
  actor: AdminActor,
  rawId: unknown,
  now = new Date(),
): Promise<AdminUserDetail> {
  assertAdminAccess(actor);
  const id = adminIdSchema.parse(rawId);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      motoboyProfile: {
        select: {
          cpfLastDigits: true,
          city: true,
          vehiclePlate: true,
          isOnline: true,
          lastLocationAt: true,
          _count: { select: { deliveries: true } },
        },
      },
      companyProfile: {
        select: {
          fantasyName: true,
          legalDocumentLastDigits: true,
          city: true,
          proEnabled: true,
          proEnabledAt: true,
          proExpiresAt: true,
          proAccessSource: true,
          _count: { select: { deliveries: true } },
          locations: {
            where: { isDefault: true },
            take: 1,
            select: {
              address: true,
              number: true,
              neighborhood: true,
              state: true,
            },
          },
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, currentPeriodEnd: true },
      },
      manualAccessGrants: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          reasonType: true,
          startsAt: true,
          endsAt: true,
          revokedAt: true,
          plan: {
            select: { id: true, name: true, monthlyPrice: true },
          },
        },
      },
    },
  });
  if (!user) throw new AdminResourceNotFoundError("Usuário não encontrado.");
  const deliveryFilter =
    user.role === "MOTOBOY" && user.motoboyProfile
      ? {
          motoboyId:
            user.motoboyProfile &&
            (
              await prisma.motoboyProfile.findUnique({
                where: { userId: id },
                select: { id: true },
              })
            )?.id,
        }
      : user.role === "COMPANY" && user.companyProfile
        ? {
            companyId: (
              await prisma.companyProfile.findUnique({
                where: { userId: id },
                select: { id: true },
              })
            )?.id,
          }
        : { id: "00000000-0000-0000-0000-000000000000" };
  const [rating, completed, cancelled, reportsReceived, reportsCreated] =
    await Promise.all([
      prisma.rating.aggregate({
        where: { reviewedUserId: id },
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.delivery.count({
        where: { ...deliveryFilter, status: "COMPLETED" },
      }),
      prisma.delivery.count({
        where: {
          ...deliveryFilter,
          status: { in: ["CANCELLED_BY_COMPANY", "CANCELLED_BY_MOTOBOY"] },
        },
      }),
      prisma.report.count({ where: { reportedUserId: id } }),
      prisma.report.count({ where: { reporterUserId: id } }),
    ]);
  const location = user.companyProfile?.locations[0];
  const cutoff = new Date(
    now.getTime() - getPresenceEnv().ONLINE_PRESENCE_TTL_MINUTES * 60_000,
  );
  const effectivelyOnline = Boolean(
    user.status === "ACTIVE" &&
    user.motoboyProfile?.isOnline &&
    user.motoboyProfile.lastLocationAt &&
    user.motoboyProfile.lastLocationAt >= cutoff,
  );
  const manualAccess = user.manualAccessGrants[0] ?? null;
  const manualStatus = manualAccess?.revokedAt
    ? "REVOKED"
    : manualAccess && manualAccess.startsAt > now
      ? "SCHEDULED"
      : manualAccess && manualAccess.endsAt <= now
        ? "EXPIRED"
        : manualAccess
          ? "ACTIVE"
          : null;
  const paidAccess = user.subscriptions[0] ?? null;
  const configuredMotoboyPlan =
    user.role === "MOTOBOY"
      ? await prisma.subscriptionPlan.findUnique({
          where: { role: "MOTOBOY" },
          select: { id: true, name: true, monthlyPrice: true },
        })
      : null;
  const related =
    user.motoboyProfile?._count.deliveries ??
    user.companyProfile?._count.deliveries ??
    0;
  return {
    id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    city: cityFromUser(user),
    createdAt: user.createdAt.toISOString(),
    relatedDeliveries: related,
    ratingAverage: rating._avg.score,
    ratingCount: rating._count._all,
    documentMasked: user.motoboyProfile
      ? `CPF final ${user.motoboyProfile.cpfLastDigits}`
      : user.companyProfile
        ? `CPF/CNPJ final ${user.companyProfile.legalDocumentLastDigits}`
        : null,
    vehiclePlate: user.motoboyProfile?.vehiclePlate ?? null,
    fantasyName: user.companyProfile?.fantasyName ?? null,
    location: location
      ? `${location.address}, ${location.number} — ${location.neighborhood}/${location.state}`
      : null,
    isOnline: user.role === "MOTOBOY" ? effectivelyOnline : null,
    lastLocationAt: iso(user.motoboyProfile?.lastLocationAt),
    deliveriesAccepted: user.motoboyProfile?._count.deliveries ?? 0,
    deliveriesCompleted: completed,
    cancellations: cancelled,
    reportsReceived,
    reportsCreated,
    companyProEnabled: user.companyProfile?.proEnabled ?? null,
    companyProEffective:
      user.companyProfile === null
        ? null
        : user.companyProfile.proEnabled &&
          (!user.companyProfile.proExpiresAt ||
            user.companyProfile.proExpiresAt > now),
    companyProEnabledAt: iso(user.companyProfile?.proEnabledAt),
    companyProExpiresAt: iso(user.companyProfile?.proExpiresAt),
    companyProAccessSource: user.companyProfile?.proAccessSource ?? null,
    motoboyPlan: configuredMotoboyPlan
      ? {
          ...configuredMotoboyPlan,
          monthlyPrice: configuredMotoboyPlan.monthlyPrice.toNumber(),
        }
      : null,
    motoboyPaidAccess: paidAccess
      ? {
          status: paidAccess.status,
          currentPeriodEnd: iso(paidAccess.currentPeriodEnd),
        }
      : null,
    motoboyManualAccess:
      manualAccess && manualStatus
        ? {
            id: manualAccess.id,
            status: manualStatus,
            reasonType: manualAccess.reasonType,
            startsAt: manualAccess.startsAt.toISOString(),
            endsAt: manualAccess.endsAt.toISOString(),
            revokedAt: iso(manualAccess.revokedAt),
          }
        : null,
  };
}

export async function changeCompanyProAccess(
  actor: AdminActor,
  rawId: unknown,
  raw: unknown,
  now = new Date(),
) {
  assertAdminAccess(actor);
  const targetUserId = adminIdSchema.parse(rawId);
  const input = companyProActionSchema.parse(raw);
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: targetUserId },
      select: {
        role: true,
        companyProfile: {
          select: {
            id: true,
            proEnabled: true,
            proEnabledAt: true,
            proExpiresAt: true,
            proAccessSource: true,
          },
        },
      },
    });
    if (!target?.companyProfile || target.role !== "COMPANY") {
      throw new AdminResourceNotFoundError("Empresa não encontrada.");
    }
    const current = target.companyProfile;
    const currentlyEffective =
      current.proEnabled &&
      (!current.proExpiresAt || current.proExpiresAt > now);
    if (input.action === "ENABLE" && currentlyEffective) {
      throw new AdminActionConflictError(
        "O Vapor Gestão Pro já está habilitado. Use estender para alterar o vencimento.",
      );
    }
    if (input.action === "EXTEND" && !current.proEnabled) {
      throw new AdminActionConflictError(
        "O Vapor Gestão Pro precisa estar habilitado antes de ser estendido.",
      );
    }
    if (input.action === "DISABLE" && !current.proEnabled) {
      throw new AdminActionConflictError(
        "O Vapor Gestão Pro já está desabilitado.",
      );
    }
    if (
      input.action === "EXTEND" &&
      current.proExpiresAt === null &&
      !input.indefinite
    ) {
      throw new AdminActionConflictError(
        "O acesso atual já não possui vencimento.",
      );
    }
    const base =
      current.proExpiresAt && current.proExpiresAt > now
        ? current.proExpiresAt
        : now;
    const nextExpiresAt =
      input.action === "DISABLE" || input.indefinite
        ? null
        : addDays(input.action === "EXTEND" ? base : now, input.days ?? 0);
    const enabled = input.action !== "DISABLE";
    const actionType =
      input.action === "ENABLE"
        ? "COMPANY_PRO_ENABLED"
        : input.action === "EXTEND"
          ? "COMPANY_PRO_EXTENDED"
          : "COMPANY_PRO_DISABLED";
    await transaction.companyProfile.update({
      where: { id: current.id },
      data: {
        proEnabled: enabled,
        proEnabledAt: input.action === "ENABLE" ? now : current.proEnabledAt,
        proExpiresAt:
          input.action === "DISABLE" ? current.proExpiresAt : nextExpiresAt,
        proAccessSource:
          input.action === "ENABLE"
            ? input.source
            : input.action === "DISABLE"
              ? current.proAccessSource
              : current.proAccessSource,
      },
    });
    const audit = await transaction.adminAction.create({
      data: {
        adminUserId: actor.userId,
        targetUserId,
        actionType,
        reason: input.reason,
        metadata: {
          before: {
            enabled: current.proEnabled,
            enabledAt: iso(current.proEnabledAt),
            expiresAt: iso(current.proExpiresAt),
            source: current.proAccessSource,
          },
          after: {
            enabled,
            enabledAt: iso(
              input.action === "ENABLE" ? now : current.proEnabledAt,
            ),
            expiresAt: iso(
              input.action === "DISABLE" ? current.proExpiresAt : nextExpiresAt,
            ),
            source:
              input.action === "ENABLE"
                ? input.source
                : current.proAccessSource,
          },
        },
        createdAt: now,
      },
    });
    return { enabled, expiresAt: iso(nextExpiresAt), auditId: audit.id };
  });
}

export async function changeMotoboyPlanAccess(
  actor: AdminActor,
  rawId: unknown,
  raw: unknown,
  now = new Date(),
) {
  assertAdminAccess(actor);
  const targetUserId = adminIdSchema.parse(rawId);
  const input = motoboyPlanActionSchema.parse(raw);
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });
    if (!target || target.role !== "MOTOBOY") {
      throw new AdminResourceNotFoundError("Motoboy não encontrado.");
    }
    await transaction.manualAccessGrant.updateMany({
      where: {
        userId: targetUserId,
        activeGrantUserKey: targetUserId,
        endsAt: { lte: now },
      },
      data: { activeGrantUserKey: null },
    });
    const activeGrant = await transaction.manualAccessGrant.findFirst({
      where: {
        userId: targetUserId,
        revokedAt: null,
        endsAt: { gt: now },
      },
      select: {
        id: true,
        planId: true,
        reasonType: true,
        startsAt: true,
        endsAt: true,
      },
    });
    if (input.action === "GRANT") {
      if (activeGrant) {
        throw new AdminActionConflictError(
          "O motoboy já possui acesso manual ativo. Use estender.",
        );
      }
      const plan = await transaction.subscriptionPlan.findUnique({
        where: { id: input.planId },
        select: { id: true, role: true, name: true },
      });
      if (!plan || plan.role !== "MOTOBOY") {
        throw new AdminResourceNotFoundError(
          "Plano de motoboy não encontrado.",
        );
      }
      const endsAt = addDays(now, input.days ?? 0);
      const grant = await transaction.manualAccessGrant.create({
        data: {
          activeGrantUserKey: targetUserId,
          userId: targetUserId,
          planId: plan.id,
          reasonType: input.reasonType!,
          reason: input.reason,
          startsAt: now,
          endsAt,
          grantedByAdminId: actor.userId,
          createdAt: now,
        },
      });
      const audit = await transaction.adminAction.create({
        data: {
          adminUserId: actor.userId,
          targetUserId,
          actionType: "MOTOBOY_PLAN_GRANTED",
          reason: input.reason,
          metadata: {
            source: "ADMIN_MANUAL",
            planId: plan.id,
            planName: plan.name,
            startsAt: now.toISOString(),
            endsAt: endsAt.toISOString(),
            reasonType: input.reasonType,
          },
          createdAt: now,
        },
      });
      return { grantId: grant.id, status: "ACTIVE", auditId: audit.id };
    }
    if (!activeGrant) {
      throw new AdminActionConflictError(
        "O motoboy não possui acesso manual ativo.",
      );
    }
    if (input.action === "EXTEND") {
      const endsAt = addDays(activeGrant.endsAt, input.days ?? 0);
      await transaction.manualAccessGrant.update({
        where: { id: activeGrant.id },
        data: { endsAt },
      });
      const audit = await transaction.adminAction.create({
        data: {
          adminUserId: actor.userId,
          targetUserId,
          actionType: "MOTOBOY_PLAN_EXTENDED",
          reason: input.reason,
          metadata: {
            source: "ADMIN_MANUAL",
            grantId: activeGrant.id,
            previousEndsAt: activeGrant.endsAt.toISOString(),
            newEndsAt: endsAt.toISOString(),
            addedDays: input.days,
          },
          createdAt: now,
        },
      });
      return { grantId: activeGrant.id, status: "ACTIVE", auditId: audit.id };
    }
    await transaction.manualAccessGrant.update({
      where: { id: activeGrant.id },
      data: {
        activeGrantUserKey: null,
        revokedAt: now,
        revokedByAdminId: actor.userId,
        revokedReason: input.reason,
      },
    });
    const audit = await transaction.adminAction.create({
      data: {
        adminUserId: actor.userId,
        targetUserId,
        actionType: "MOTOBOY_PLAN_REVOKED",
        reason: input.reason,
        metadata: {
          source: "ADMIN_MANUAL",
          grantId: activeGrant.id,
          previousEndsAt: activeGrant.endsAt.toISOString(),
          revokedAt: now.toISOString(),
        },
        createdAt: now,
      },
    });
    return { grantId: activeGrant.id, status: "REVOKED", auditId: audit.id };
  });
}

export async function changeAdminUserStatus(
  actor: AdminActor,
  rawId: unknown,
  raw: unknown,
) {
  assertAdminAccess(actor);
  const targetId = adminIdSchema.parse(rawId);
  const input = userStatusActionSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetId },
      select: {
        role: true,
        status: true,
        motoboyProfile: { select: { id: true } },
      },
    });
    if (!target)
      throw new AdminResourceNotFoundError("Usuário não encontrado.");
    assertModerationTarget(actor.userId, {
      id: targetId,
      role: target.role,
      status: target.status,
    });
    if (target.status === input.status)
      throw new AdminActionConflictError("A conta já está com esse status.");
    const actionType = administrativeActionForStatus(input.status);
    await tx.user.update({
      where: { id: targetId },
      data: { status: input.status },
    });
    await tx.session.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (target.motoboyProfile)
      await tx.motoboyProfile.update({
        where: { id: target.motoboyProfile.id },
        data: { isOnline: false, onlineSince: null },
      });
    const log = await tx.adminAction.create({
      data: {
        adminUserId: actor.userId,
        targetUserId: targetId,
        actionType,
        reason: input.reason,
        metadata: { previousStatus: target.status, newStatus: input.status },
      },
    });
    return { status: input.status, auditId: log.id };
  });
}

function deliveryWhere(
  input: ReturnType<typeof deliverySearchSchema.parse>,
): Prisma.DeliveryWhereInput {
  return {
    status: input.status,
    pickupCity: input.city,
    id: input.deliveryId || undefined,
    createdAt: dateRange(input.from, input.to),
    company: input.company
      ? { fantasyName: { contains: input.company } }
      : undefined,
    motoboy: input.motoboy
      ? { user: { name: { contains: input.motoboy } } }
      : undefined,
  };
}

export async function listAdminDeliveries(
  actor: AdminActor,
  raw: unknown,
): Promise<Paginated<AdminDeliveryListItem>> {
  assertAdminAccess(actor);
  const input = deliverySearchSchema.parse(raw);
  const where = deliveryWhere(input);
  const [rows, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { fantasyName: true } },
        motoboy: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.delivery.count({ where }),
  ]);
  return pageResult(
    rows.map((row) => ({
      id: row.id,
      companyName: row.company.fantasyName,
      motoboyName: row.motoboy?.user.name ?? null,
      pickupSummary: `${row.pickupAddress}, ${row.pickupNumber} — ${row.pickupNeighborhood}`,
      destinationSummary: `${row.destinationAddress}, ${row.destinationNumber} — ${row.destinationNeighborhood}`,
      city: row.pickupCity,
      status: row.status,
      offeredPrice: Number(row.offeredPrice),
      createdAt: row.createdAt.toISOString(),
      completedAt: iso(row.completedAt),
    })),
    input.page,
    input.pageSize,
    total,
  );
}

export async function getAdminDelivery(
  actor: AdminActor,
  rawId: unknown,
): Promise<AdminDeliveryDetail> {
  assertAdminAccess(actor);
  const id = adminIdSchema.parse(rawId);
  const row = await prisma.delivery.findUnique({
    where: { id },
    include: {
      company: { select: { fantasyName: true } },
      motoboy: { select: { user: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      ratings: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewer: { select: { name: true } },
          reviewed: { select: { name: true } },
        },
      },
      reports: {
        orderBy: { createdAt: "asc" },
        select: { id: true, category: true, status: true, createdAt: true },
      },
    },
  });
  if (!row) throw new AdminResourceNotFoundError("Entrega não encontrada.");
  const actorIds = [
    ...new Set(
      row.statusHistory.flatMap((item) =>
        item.actorUserId ? [item.actorUserId] : [],
      ),
    ),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(actors.map((item) => [item.id, item.name]));
  return {
    id: row.id,
    companyName: row.company.fantasyName,
    motoboyName: row.motoboy?.user.name ?? null,
    pickupSummary: `${row.pickupAddress}, ${row.pickupNumber} — ${row.pickupNeighborhood}`,
    destinationSummary: `${row.destinationAddress}, ${row.destinationNumber} — ${row.destinationNeighborhood}`,
    city: row.pickupCity,
    status: row.status,
    offeredPrice: Number(row.offeredPrice),
    createdAt: row.createdAt.toISOString(),
    completedAt: iso(row.completedAt),
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    notes: row.notes,
    history: row.statusHistory.map((item) => ({
      id: item.id,
      previousStatus: item.previousStatus,
      newStatus: item.newStatus,
      actorName: item.actorUserId
        ? (names.get(item.actorUserId) ?? null)
        : null,
      actorRole: item.actorRole,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    })),
    ratings: row.ratings.map((item) => ({
      id: item.id,
      reviewerName: item.reviewer.name,
      reviewedName: item.reviewed.name,
      score: item.score,
      comment: item.comment,
      createdAt: item.createdAt.toISOString(),
    })),
    reports: row.reports.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function listAdminReports(
  actor: AdminActor,
  raw: unknown,
): Promise<Paginated<AdminReportListItem>> {
  assertAdminAccess(actor);
  const input = reportSearchSchema.parse(raw);
  const where: Prisma.ReportWhereInput = {
    status: input.status,
    category: input.category,
    createdAt: dateRange(input.from, input.to),
  };
  const [rows, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true } },
        reported: { select: { name: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);
  return pageResult(
    rows.map((row) => ({
      id: row.id,
      reporterName: row.reporter.name,
      reportedName: row.reported?.name ?? null,
      deliveryId: row.deliveryId,
      category: row.category,
      status: row.status,
      description: row.description,
      adminNotes: row.adminNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    input.page,
    input.pageSize,
    total,
  );
}

export async function getAdminReport(
  actor: AdminActor,
  rawId: unknown,
): Promise<AdminReportListItem> {
  assertAdminAccess(actor);
  const id = adminIdSchema.parse(rawId);
  const row = await prisma.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { name: true } },
      reported: { select: { name: true } },
    },
  });
  if (!row) throw new AdminResourceNotFoundError("Denúncia não encontrada.");
  return {
    id: row.id,
    reporterName: row.reporter.name,
    reportedName: row.reported?.name ?? null,
    deliveryId: row.deliveryId,
    category: row.category,
    status: row.status,
    description: row.description,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function changeAdminReportStatus(
  actor: AdminActor,
  rawId: unknown,
  raw: unknown,
) {
  assertAdminAccess(actor);
  const id = adminIdSchema.parse(rawId);
  const input = reportStatusActionSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id },
      select: { status: true, reportedUserId: true },
    });
    if (!report)
      throw new AdminResourceNotFoundError("Denúncia não encontrada.");
    if (!canTransitionReport(report.status, input.status))
      throw new AdminActionConflictError(
        "Transição de status da denúncia não permitida.",
      );
    await tx.report.update({
      where: { id },
      data: { status: input.status, adminNotes: input.adminNotes },
    });
    const log = await tx.adminAction.create({
      data: {
        adminUserId: actor.userId,
        targetUserId: report.reportedUserId,
        actionType:
          input.status === "RESOLVED"
            ? "REPORT_RESOLVED"
            : "REPORT_STATUS_CHANGED",
        reason: input.reason,
        metadata: {
          reportId: id,
          previousStatus: report.status,
          newStatus: input.status,
        },
      },
    });
    return { status: input.status, auditId: log.id };
  });
}

export async function listAdminAudit(
  actor: AdminActor,
  raw: unknown,
): Promise<Paginated<AdminAuditItem>> {
  assertAdminAccess(actor);
  const input = auditSearchSchema.parse(raw);
  const where: Prisma.AdminActionWhereInput = { actionType: input.actionType };
  const [rows, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true } },
        target: { select: { name: true } },
      },
    }),
    prisma.adminAction.count({ where }),
  ]);
  return pageResult(
    rows.map((row) => ({
      id: row.id,
      adminName: row.admin.name,
      targetName: row.target?.name ?? null,
      actionType: row.actionType,
      reason: row.reason,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
    input.page,
    input.pageSize,
    total,
  );
}
