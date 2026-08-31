import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("gera hash Argon2id e valida a senha correta", async () => {
    const passwordHash = await hashPassword("SenhaSegura123");

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, "SenhaSegura123")).resolves.toBe(
      true,
    );
  });

  it("rejeita senha incorreta e hash malformado", async () => {
    const passwordHash = await hashPassword("SenhaSegura123");

    await expect(verifyPassword(passwordHash, "OutraSenha123")).resolves.toBe(
      false,
    );
    await expect(
      verifyPassword("hash-invalido", "SenhaSegura123"),
    ).resolves.toBe(false);
  });
});
