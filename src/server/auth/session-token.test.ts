import { describe, expect, it } from "vitest";

import { getSessionCookieOptions } from "./session-constants";
import { createSessionToken, hashSessionToken } from "./session-token";

describe("sessão", () => {
  it("gera token imprevisível e persiste apenas o digest SHA-256", () => {
    const firstToken = createSessionToken();
    const secondToken = createSessionToken();
    const digest = hashSessionToken(firstToken);

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken.length).toBeGreaterThanOrEqual(43);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(firstToken);
  });

  it("configura cookie seguro para produção", () => {
    const expiresAt = new Date("2026-09-03T12:00:00.000Z");

    expect(getSessionCookieOptions(expiresAt, true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });
});
