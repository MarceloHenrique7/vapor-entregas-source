import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RegistrationRateLimitError } from "./errors";
import { enforceRegistrationRateLimit } from "./rate-limit";

describe("limite do cadastro completo", () => {
  it("limita tentativas repetidas e libera uma nova janela", () => {
    const key = randomUUID();
    const now = 1_800_000_000_000;
    for (let index = 0; index < 6; index += 1) {
      expect(() =>
        enforceRegistrationRateLimit(key, now + index),
      ).not.toThrow();
    }
    expect(() => enforceRegistrationRateLimit(key, now + 6)).toThrow(
      RegistrationRateLimitError,
    );
    expect(() =>
      enforceRegistrationRateLimit(key, now + 3_600_001),
    ).not.toThrow();
  });
});
