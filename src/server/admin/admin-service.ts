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
  auditSearchSchema,
  deliverySearchSchema,
  reportSearchSchema,
  reportStatusActionSchema,
  userSearchSchema,
  userStatusActionSchema,
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
  now = new Date(),
): Promise<AdminDashboardMetrics> {
  assertAdminAccess(actor);
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
    prisma.delivery.count(),
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
  };
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
        actionType: "REPORT_STATUS_CHANGED",
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
