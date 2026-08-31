import { expect, it } from "vitest";

import { ReportRateLimitError } from "./errors";
import { enforceReportRateLimit } from "./report-rate-limit";

it("limita criação excessiva de denúncias", () => {
  const userId = "rate-limit-test-user";
  const now = new Date("2026-08-27T20:00:00.000Z").getTime();
  for (let index = 0; index < 5; index += 1) {
    expect(() => enforceReportRateLimit(userId, now + index)).not.toThrow();
  }
  expect(() => enforceReportRateLimit(userId, now + 10)).toThrow(
    ReportRateLimitError,
  );
});
