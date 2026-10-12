import { z } from "zod";

import { ForbiddenError } from "@/server/auth/errors";

import {
  EARNINGS_PERIODS,
  type EarningsDeliveryView,
  type EarningsGroup,
  type EarningsPeriod,
  type MotoboyEarningsView,
} from "./types";

export const earningsPeriodSchema = z.enum(EARNINGS_PERIODS).default("30");

export interface EarningsRepository {
  getMotoboyEarnings(
    userId: string,
    since?: Date,
  ): Promise<{
    groups: EarningsGroup[];
    deliveries: EarningsDeliveryView[];
  } | null>;
}

export function getEarningsPeriodStart(
  period: EarningsPeriod,
  now: Date,
): Date | undefined {
  if (period === "all") return undefined;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Number(period));
  return start;
}

export function summarizeEarnings(
  period: EarningsPeriod,
  groups: EarningsGroup[],
  deliveries: EarningsDeliveryView[],
): MotoboyEarningsView {
  const sum = (statuses: EarningsGroup["paymentStatus"][]) =>
    groups
      .filter((group) => statuses.includes(group.paymentStatus))
      .reduce((total, group) => total + group.amount, 0);

  return {
    period,
    totals: {
      gross: sum([
        "UNTRACKED",
        "PENDING",
        "REPORTED_PAID",
        "CONFIRMED",
        "DISPUTED",
      ]),
      confirmed: sum(["CONFIRMED"]),
      awaitingConfirmation: sum(["UNTRACKED", "PENDING", "REPORTED_PAID"]),
      disputed: sum(["DISPUTED"]),
      deliveries: groups.reduce((total, group) => total + group.count, 0),
    },
    deliveries,
  };
}

export async function getMotoboyEarnings(
  userId: string,
  rawPeriod: unknown,
  repository: EarningsRepository,
  now = new Date(),
) {
  const period = earningsPeriodSchema.parse(rawPeriod);
  const result = await repository.getMotoboyEarnings(
    userId,
    getEarningsPeriodStart(period, now),
  );
  if (!result) throw new ForbiddenError();
  return summarizeEarnings(period, result.groups, result.deliveries);
}
