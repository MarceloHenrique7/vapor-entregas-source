import { describe, expect, it } from "vitest";

import { LocationRateLimitError } from "./errors";
import { enforceLocationRateLimit } from "./rate-limit";

describe("limite de busca de endereço", () => {
  it("limita rajadas por usuário e libera uma nova janela", () => {
    const userId = "address-search-rate-limit-user";
    const now = 1_800_000_000_000;
    for (let index = 0; index < 60; index += 1) {
      expect(() => enforceLocationRateLimit(userId, now + index)).not.toThrow();
    }
    expect(() => enforceLocationRateLimit(userId, now + 60)).toThrow(
      LocationRateLimitError,
    );
    expect(() => enforceLocationRateLimit(userId, now + 60_001)).not.toThrow();
  });
});
