import { describe, expect, it, vi } from "vitest";

import {
  getEarningsPeriodStart,
  getMotoboyEarnings,
  summarizeEarnings,
  type EarningsRepository,
} from "./earnings-service";

const deliveries = [
  {
    id: "delivery-1",
    companyName: "Mercado Central",
    offeredPrice: 24,
    paymentMethod: "PIX" as const,
    paymentStatus: "CONFIRMED" as const,
    completedAt: "2026-10-12T12:00:00.000Z",
  },
];

describe("motoboy earnings", () => {
  it("separates confirmed, awaiting and disputed amounts", () => {
    const result = summarizeEarnings(
      "30",
      [
        { paymentStatus: "CONFIRMED", amount: 80, count: 3 },
        { paymentStatus: "REPORTED_PAID", amount: 25, count: 1 },
        { paymentStatus: "PENDING", amount: 15, count: 1 },
        { paymentStatus: "DISPUTED", amount: 20, count: 1 },
      ],
      deliveries,
    );

    expect(result.totals).toEqual({
      gross: 140,
      confirmed: 80,
      awaitingConfirmation: 40,
      disputed: 20,
      deliveries: 6,
    });
  });

  it("calculates the selected period without changing the supplied date", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");
    expect(getEarningsPeriodStart("30", now)?.toISOString()).toBe(
      "2026-09-12T12:00:00.000Z",
    );
    expect(getEarningsPeriodStart("all", now)).toBeUndefined();
    expect(now.toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });

  it("loads only the authenticated motoboy data through the repository", async () => {
    const repository: EarningsRepository = {
      getMotoboyEarnings: vi.fn().mockResolvedValue({
        groups: [{ paymentStatus: "CONFIRMED", amount: 24, count: 1 }],
        deliveries,
      }),
    };

    const result = await getMotoboyEarnings(
      "user-1",
      "7",
      repository,
      new Date("2026-10-12T12:00:00.000Z"),
    );

    expect(repository.getMotoboyEarnings).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-10-05T12:00:00.000Z"),
    );
    expect(result.totals.confirmed).toBe(24);
  });
});
