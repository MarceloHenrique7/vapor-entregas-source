import "server-only";

import { PAYMENT_METHOD_LABELS } from "@/config/delivery";
import { getPrisma } from "@/server/db/prisma";

import {
  CompanyReportLimitError,
  CompanyReportProfileRequiredError,
} from "./errors";
import { companyReportFilterSchema } from "./schemas";
import type { CompanyReportData } from "./types";

const DAY_MS = 86_400_000;
const CANCELLED = new Set(["CANCELLED_BY_COMPANY", "CANCELLED_BY_MOTOBOY"]);

function dateRange(from?: string, to?: string, now = new Date()) {
  const defaultTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 3),
  );
  const defaultFrom = new Date(defaultTo.getTime() - 30 * DAY_MS);
  return {
    from: from ? new Date(`${from}T03:00:00.000Z`) : defaultFrom,
    to: to
      ? new Date(new Date(`${to}T03:00:00.000Z`).getTime() + DAY_MS)
      : defaultTo,
  };
}

const toCents = (value: { toNumber(): number } | number | null) =>
  Math.round(
    (value === null
      ? 0
      : typeof value === "number"
        ? value
        : value.toNumber()) * 100,
  );

export async function getCompanyReportData(
  userId: string,
  rawFilters: unknown,
  now = new Date(),
): Promise<CompanyReportData> {
  const filters = companyReportFilterSchema.parse(rawFilters);
  const period = dateRange(filters.from, filters.to, now);
  const prisma = getPrisma();
  const company = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { id: true, fantasyName: true },
  });
  if (!company) throw new CompanyReportProfileRequiredError();

  const where = {
    companyId: company.id,
    createdAt: { gte: period.from, lt: period.to },
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.motoboyId ? { motoboyId: filters.motoboyId } : {}),
    ...(filters.channel === "VAPOR"
      ? { importedOrder: null }
      : filters.channel
        ? { importedOrder: { is: { provider: filters.channel } } }
        : {}),
  } as const;
  const count = await prisma.delivery.count({ where });
  if (count > 10_000) throw new CompanyReportLimitError();

  const rows = await prisma.delivery.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      createdAt: true,
      pickupAddress: true,
      pickupNumber: true,
      pickupNeighborhood: true,
      destinationAddress: true,
      destinationNumber: true,
      destinationNeighborhood: true,
      distanceEstimateKm: true,
      offeredPrice: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      notes: true,
      motoboy: { select: { user: { select: { name: true } } } },
      extras: {
        where: { status: "ACKNOWLEDGED", amount: { not: null } },
        select: { amount: true },
      },
      importedOrder: { select: { provider: true, channel: true } },
    },
  });

  const mapped = rows.map((row) => {
    const baseValueCents = toCents(row.offeredPrice);
    const acknowledgedExtrasCents = row.extras.reduce(
      (sum, extra) => sum + toCents(extra.amount),
      0,
    );
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      origin: `${row.pickupAddress}, ${row.pickupNumber} · ${row.pickupNeighborhood}`,
      destination: `${row.destinationAddress}, ${row.destinationNumber}`,
      destinationNeighborhood: row.destinationNeighborhood,
      motoboy: row.motoboy?.user.name ?? "Não atribuído",
      distanceKm: row.distanceEstimateKm.toNumber(),
      baseValueCents,
      acknowledgedExtrasCents,
      finalRecordedValueCents: baseValueCents + acknowledgedExtrasCents,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentMethod: PAYMENT_METHOD_LABELS[row.paymentMethod],
      channel: row.importedOrder?.channel ?? "Vapor Entregas",
      notes: row.notes ?? "",
    };
  });
  const completed = mapped.filter((row) => row.status === "COMPLETED");
  const totalRecordedCents = completed.reduce(
    (sum, row) => sum + row.finalRecordedValueCents,
    0,
  );
  const confirmedPaymentCents = completed
    .filter((row) => row.paymentStatus === "CONFIRMED")
    .reduce((sum, row) => sum + row.finalRecordedValueCents, 0);
  return {
    companyName: company.fantasyName,
    generatedAt: now.toISOString(),
    period: { from: period.from.toISOString(), to: period.to.toISOString() },
    filters: {
      status: filters.status ?? null,
      motoboyId: filters.motoboyId ?? null,
      channel: filters.channel ?? null,
    },
    summary: {
      totalDeliveries: mapped.length,
      completedDeliveries: completed.length,
      cancelledDeliveries: mapped.filter((row) => CANCELLED.has(row.status))
        .length,
      totalRecordedCents,
      averageRecordedCents: completed.length
        ? Math.round(totalRecordedCents / completed.length)
        : 0,
      confirmedPaymentCents,
      pendingOrUnconfirmedCents: totalRecordedCents - confirmedPaymentCents,
    },
    rows: mapped,
    notice:
      "Os valores são registros informativos da operação e não comprovam pagamento. A Vapor Entregas não recebe, custodia nem repassa o valor das corridas.",
  };
}

export async function listCompanyReportMotoboys(userId: string) {
  const company = await getPrisma().companyProfile.findUnique({
    where: { userId },
    select: {
      deliveries: {
        where: { motoboyId: { not: null } },
        distinct: ["motoboyId"],
        take: 500,
        select: {
          motoboy: { select: { id: true, user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!company) throw new CompanyReportProfileRequiredError();
  return company.deliveries
    .flatMap((item) => (item.motoboy ? [item.motoboy] : []))
    .sort((a, b) => a.user.name.localeCompare(b.user.name, "pt-BR"))
    .map((item) => ({ id: item.id, name: item.user.name }));
}
