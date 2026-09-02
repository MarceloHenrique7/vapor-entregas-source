import { describe, expect, it } from "vitest";

import { ACCESS_DURATION_MS, calculateAccessPeriod } from "./access-period";

describe("período local de acesso", () => {
  it("inicia 30 dias exatos na aprovação quando o acesso expirou", () => {
    const approvedAt = new Date("2026-09-02T12:00:00.000Z");
    const result = calculateAccessPeriod(
      new Date("2026-07-01T12:00:00.000Z"),
      new Date("2026-08-01T12:00:00.000Z"),
      approvedAt,
    );

    expect(result.startsAt).toEqual(approvedAt);
    expect(result.expiresAt.getTime() - approvedAt.getTime()).toBe(
      ACCESS_DURATION_MS,
    );
  });

  it("soma 30 dias ao vencimento atual na renovação antecipada", () => {
    const startsAt = new Date("2026-09-01T12:00:00.000Z");
    const currentEnd = new Date("2026-09-25T12:00:00.000Z");
    const result = calculateAccessPeriod(
      startsAt,
      currentEnd,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    expect(result.startsAt).toEqual(startsAt);
    expect(result.expiresAt.getTime() - currentEnd.getTime()).toBe(
      ACCESS_DURATION_MS,
    );
  });
});
