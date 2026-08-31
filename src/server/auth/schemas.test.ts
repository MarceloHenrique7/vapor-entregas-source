import { describe, expect, it } from "vitest";

import { loginSchema, passwordSchema, roleSchema } from "./schemas";

describe("schemas de autenticação", () => {
  it("normaliza o e-mail de login", () => {
    const result = loginSchema.parse({
      email: "  Admin@Vapor-Entregas.Local ",
      password: "SenhaSegura123",
    });

    expect(result.email).toBe("admin@vapor-entregas.local");
  });

  it("exige uma senha forte para novos usuários", () => {
    expect(passwordSchema.safeParse("senha-fraca").success).toBe(false);
    expect(passwordSchema.safeParse("SenhaForte123").success).toBe(true);
  });

  it.each(["MOTOBOY", "COMPANY", "ADMIN"])("aceita a função %s", (role) => {
    expect(roleSchema.parse(role)).toBe(role);
  });
});
