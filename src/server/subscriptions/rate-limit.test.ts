import { describe, expect, it } from "vitest";

import { SubscriptionRateLimitError } from "./errors";
import {
  enforceSubscriptionRateLimit,
  enforceSubscriptionStatusRateLimit,
} from "./rate-limit";

describe("limites de assinatura", () => {
  it("mantém ações sensíveis no limite existente", () => {
    const userId = crypto.randomUUID();
    for (let index = 0; index < 10; index += 1) {
      expect(() => enforceSubscriptionRateLimit(userId, index)).not.toThrow();
    }
    expect(() => enforceSubscriptionRateLimit(userId, 10)).toThrow(
      SubscriptionRateLimitError,
    );
  });

  it("isola o polling de status das ações sensíveis", () => {
    const userId = crypto.randomUUID();
    for (let index = 0; index < 20; index += 1) {
      expect(() =>
        enforceSubscriptionStatusRateLimit(userId, index),
      ).not.toThrow();
    }
    expect(() => enforceSubscriptionStatusRateLimit(userId, 20)).toThrow(
      SubscriptionRateLimitError,
    );
    expect(() => enforceSubscriptionRateLimit(userId, 20)).not.toThrow();
  });
});
