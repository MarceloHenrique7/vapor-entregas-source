import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/config/delivery";
import { getPrisma } from "@/server/db/prisma";

import {
  CompanyProExportLimitError,
  CompanyProProfileRequiredError,
  CompanyProRequiredError,
} from "./errors";
import { companyProPeriodSchema, type CompanyProPeriodInput } from "./schemas";
import type { CompanyPlanOverview, CompanyProOverview } from "./types";

const BAHIA_OFFSET_MS = 3 * 60 * 60 * 1_000;
const ACTIVE_STATUSES = [
  "SEARCHING_MOTOBOY",
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
] as const;
const CANCELLED_STATUSES = [
  "CANCELLED_BY_COMPANY",
  "CANCELLED_BY_MOTOBOY",
] as const;
const PAYMENT_PENDING_STATUSES = [
  "UNTRACKED",
  "PENDING",
  "REPORTED_PAID",
  "DISPUTED",
] as const;

interface ResolvedPeriod {
  key: CompanyProPeriodInput["period"];
  from: Date;
  to: Date;
  label: string;
}

function localParts(now: Date) {
  const shifted = new Date(now.getTime() - BAHIA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function bahiaMidnight(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 3));
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

export function resolveCompanyProPeriod(
  raw: unknown,
  now = new Date(),
): ResolvedPeriod {
  const input = companyProPeriodSchema.parse(raw);
  const { year, month, day } = localParts(now);
  const today = bahiaMidnight(year, month, day);
  if (input.period === "custom") {
    const [fromYear, fromMonth, fromDay] = input.from!.split("-").map(Number);
    const [toYear, toMonth, toDay] = input.to!.split("-").map(Number);
    const from = bahiaMidnight(fromYear, fromMonth - 1, fromDay);
    const to = addDays(bahiaMidnight(toYear, toMonth - 1, toDay), 1);
    return { key: input.period, from, to, label: "Período personalizado" };
  }
  if (input.period === "today") {
    return {
      key: input.period,
      from: today,
      to: addDays(today, 1),
      label: "Hoje",
    };
  }
  if (input.period === "7d" || input.period === "30d") {
    const days = input.period === "7d" ? 7 : 30;
    return {
      key: input.period,
      from: addDays(today, -(days - 1)),
      to: addDays(today, 1),
      label: `Últimos ${days} dias`,
    };
  }
  if (input.period === "previous_month") {
    return {
      key: input.period,
      from: bahiaMidnight(year, month - 1, 1),
      to: bahiaMidnight(year, month, 1),
      label: "Mês anterior",
    };
  }
  return {
    key: input.period,
    from: bahiaMidnight(year, month, 1),
    to: bahiaMidnight(year, month + 1, 1),
    label: "Mês atual",
  };
}

async function requireCompanyPro(userId: string) {
  const profile = await getPrisma().companyProfile.findUnique({
    where: { userId },
    select: { id: true, proEnabled: true, proExpiresAt: true },
  });
  if (!profile) throw new CompanyProProfileRequiredError();
  if (
    !profile.proEnabled ||
    (profile.proExpiresAt !== null && profile.proExpiresAt <= new Date())
  )
    throw new CompanyProRequiredError();
  return profile;
}

export async function getCompanyPlanOverview(
  userId: string,
  now = new Date(),
): Promise<CompanyPlanOverview> {
  const profile = await getPrisma().companyProfile.findUnique({
    where: { userId },
    select: {
      proEnabled: true,
      proEnabledAt: true,
      proExpiresAt: true,
      proAccessSource: true,
    },
  });
  if (!profile) throw new CompanyProProfileRequiredError();
  const proEffective =
    profile.proEnabled && (!profile.proExpiresAt || profile.proExpiresAt > now);
  return {
    currentPlan: proEffective ? "PRO" : "FREE",
    proEnabled: profile.proEnabled,
    proEffective,
    proEnabledAt: profile.proEnabledAt?.toISOString() ?? null,
    proExpiresAt: profile.proExpiresAt?.toISOString() ?? null,
    proAccessSource: profile.proAccessSource,
    proPrice: null,
    checkoutAvailable: false,
  };
}

function toNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value ?? 0);
}

export async function getCompanyProOverview(
  userId: string,
  raw: unknown,
  now = new Date(),
): Promise<CompanyProOverview> {
  const profile = await requireCompanyPro(userId);
  const period = resolveCompanyProPeriod(raw, now);
  const prisma = getPrisma();
  const where = {
    companyId: profile.id,
    createdAt: { gte: period.from, lt: period.to },
  } as const;
  const completedWhere = { ...where, status: "COMPLETED" as const };
  const durationMs = period.to.getTime() - period.from.getTime();
  const previousFrom = new Date(period.from.getTime() - durationMs);
  const previousWhere = {
    companyId: profile.id,
    createdAt: { gte: previousFrom, lt: period.from },
  } as const;

  const [
    totalDeliveries,
    completedDeliveries,
    cancelledDeliveries,
    activeDeliveries,
    completedAggregate,
    paymentGroups,
    pendingAggregate,
    motoboys,
    statusGroups,
    dailyRows,
    hourRows,
    topMotoboyRows,
    previousDeliveries,
    previousSpendAggregate,
  ] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.count({ where: completedWhere }),
    prisma.delivery.count({
      where: { ...where, status: { in: [...CANCELLED_STATUSES] } },
    }),
    prisma.delivery.count({
      where: { ...where, status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.delivery.aggregate({
      where: completedWhere,
      _sum: { offeredPrice: true, distanceEstimateKm: true },
      _avg: { offeredPrice: true },
    }),
    prisma.delivery.groupBy({
      by: ["paymentStatus"],
      where: completedWhere,
      _count: { _all: true },
    }),
    prisma.delivery.aggregate({
      where: {
        ...completedWhere,
        paymentStatus: { in: [...PAYMENT_PENDING_STATUSES] },
      },
      _sum: { offeredPrice: true },
    }),
    prisma.delivery.groupBy({
      by: ["motoboyId"],
      where: { ...where, motoboyId: { not: null } },
    }),
    prisma.delivery.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.$queryRaw<
      Array<{
        day: string;
        deliveryCount: bigint;
        spendAmount: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT
        DATE_FORMAT(DATE_SUB(createdAt, INTERVAL 3 HOUR), '%Y-%m-%d') AS day,
        COUNT(*) AS deliveryCount,
        COALESCE(SUM(IF(status = 'COMPLETED', offeredPrice, 0)), 0) AS spendAmount
      FROM deliveries
      WHERE companyId = ${profile.id}
        AND createdAt >= ${period.from}
        AND createdAt < ${period.to}
      GROUP BY day
      ORDER BY day ASC
    `),
    prisma.$queryRaw<Array<{ hour: number; deliveryCount: bigint }>>(Prisma.sql`
      SELECT
        HOUR(DATE_SUB(createdAt, INTERVAL 3 HOUR)) AS hour,
        COUNT(*) AS deliveryCount
      FROM deliveries
      WHERE companyId = ${profile.id}
        AND createdAt >= ${period.from}
        AND createdAt < ${period.to}
      GROUP BY hour
      ORDER BY deliveryCount DESC, hour ASC
    `),
    prisma.$queryRaw<
      Array<{
        name: string;
        deliveryCount: bigint;
        spendAmount: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT
        users.name AS name,
        COUNT(*) AS deliveryCount,
        COALESCE(SUM(deliveries.offeredPrice), 0) AS spendAmount
      FROM deliveries
      INNER JOIN motoboy_profiles
        ON motoboy_profiles.id = deliveries.motoboyId
      INNER JOIN users
        ON users.id = motoboy_profiles.userId
      WHERE deliveries.companyId = ${profile.id}
        AND deliveries.status = 'COMPLETED'
        AND deliveries.createdAt >= ${period.from}
        AND deliveries.createdAt < ${period.to}
      GROUP BY users.id, users.name
      ORDER BY deliveryCount DESC, spendAmount DESC
      LIMIT 5
    `),
    prisma.delivery.count({ where: previousWhere }),
    prisma.delivery.aggregate({
      where: { ...previousWhere, status: "COMPLETED" },
      _sum: { offeredPrice: true },
    }),
  ]);

  const totalRecordedSpend = toNumber(completedAggregate._sum.offeredPrice);
  const totalDistanceKm = toNumber(completedAggregate._sum.distanceEstimateKm);
  const confirmedPayments =
    paymentGroups.find((item) => item.paymentStatus === "CONFIRMED")?._count
      ._all ?? 0;
  const settledBase = completedDeliveries + cancelledDeliveries;
  const previousSpend = toNumber(previousSpendAggregate._sum.offeredPrice);
  const percentChange = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : null;

  return {
    proEnabled: true,
    period: {
      key: period.key,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      label: period.label,
    },
    metrics: {
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      activeDeliveries,
      totalRecordedSpend,
      averageCost: toNumber(completedAggregate._avg.offeredPrice),
      totalDistanceKm,
      averageCostPerKm:
        totalDistanceKm > 0 ? totalRecordedSpend / totalDistanceKm : null,
      completionRate:
        settledBase > 0 ? (completedDeliveries / settledBase) * 100 : 0,
      motoboysUsed: motoboys.length,
      pendingPayments: completedDeliveries - confirmedPayments,
      confirmedPayments,
      pendingValue: toNumber(pendingAggregate._sum.offeredPrice),
    },
    daily: dailyRows.map((item) => ({
      day: String(item.day),
      deliveries: toNumber(item.deliveryCount),
      spend: toNumber(item.spendAmount),
    })),
    hours: hourRows.map((item) => ({
      hour: toNumber(item.hour),
      deliveries: toNumber(item.deliveryCount),
    })),
    statuses: statusGroups.map((item) => ({
      status: item.status,
      count: item._count._all,
    })),
    topMotoboys: topMotoboyRows.map((item) => ({
      name: item.name,
      deliveries: toNumber(item.deliveryCount),
      spend: toNumber(item.spendAmount),
    })),
    comparison: {
      previousDeliveries,
      previousSpend,
      deliveryChangePercent: percentChange(totalDeliveries, previousDeliveries),
      spendChangePercent: percentChange(totalRecordedSpend, previousSpend),
    },
  };
}

export function escapeCsvCell(value: unknown) {
  let text = String(value ?? "").replace(/[\r\n]+/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportCompanyProCsv(
  userId: string,
  raw: unknown,
  now = new Date(),
) {
  const profile = await requireCompanyPro(userId);
  const period = resolveCompanyProPeriod(raw, now);
  const prisma = getPrisma();
  const where = {
    companyId: profile.id,
    createdAt: { gte: period.from, lt: period.to },
  } as const;
  const total = await prisma.delivery.count({ where });
  if (total > 10_000) throw new CompanyProExportLimitError();
  const rows = await prisma.delivery.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      pickupNeighborhood: true,
      pickupCity: true,
      destinationNeighborhood: true,
      destinationCity: true,
      status: true,
      offeredPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      distanceEstimateKm: true,
      acceptedAt: true,
      completedAt: true,
      motoboy: { select: { user: { select: { name: true } } } },
    },
  });
  const headers = [
    "ID da entrega",
    "Criada em",
    "Coleta",
    "Destino",
    "Motoboy",
    "Status",
    "Valor registrado",
    "Forma de pagamento",
    "Status do pagamento",
    "Distância (km)",
    "Aceita em",
    "Concluída em",
  ];
  const formatDate = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Bahia",
          dateStyle: "short",
          timeStyle: "medium",
        }).format(value)
      : "";
  const lines = rows.map((row) =>
    [
      row.id,
      formatDate(row.createdAt),
      `${row.pickupNeighborhood}/${row.pickupCity}`,
      `${row.destinationNeighborhood}/${row.destinationCity}`,
      row.motoboy?.user.name ?? "",
      row.status,
      row.offeredPrice.toFixed(2).replace(".", ","),
      PAYMENT_METHOD_LABELS[row.paymentMethod],
      row.paymentStatus,
      row.distanceEstimateKm.toFixed(2).replace(".", ","),
      formatDate(row.acceptedAt),
      formatDate(row.completedAt),
    ]
      .map(escapeCsvCell)
      .join(";"),
  );
  return {
    content: `\uFEFF${headers.map(escapeCsvCell).join(";")}\r\n${lines.join("\r\n")}`,
    filename: `vapor-gestao-${period.from.toISOString().slice(0, 10)}-${addDays(
      period.to,
      -1,
    )
      .toISOString()
      .slice(0, 10)}.csv`,
  };
}
