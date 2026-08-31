import { describe, expect, it } from "vitest";

import { assertRole } from "./authorization";
import { ForbiddenError } from "./errors";
import { canRoleAccessPath } from "./route-policy";
import type { Role, SessionUser } from "./types";

function sessionUser(role: Role): SessionUser {
  return {
    id: "55fbc9d1-c52d-47bf-8a0a-c2715ccde227",
    name: "Usuário de teste",
    email: "teste@vapor-entregas.local",
    role,
    status: "ACTIVE",
  };
}

describe("autorização por função", () => {
  it("permite somente ADMIN nas rotas administrativas", () => {
    expect(canRoleAccessPath("ADMIN", "/admin/usuarios")).toBe(true);
    expect(canRoleAccessPath("COMPANY", "/admin/usuarios")).toBe(false);
    expect(canRoleAccessPath("MOTOBOY", "/admin/usuarios")).toBe(false);
  });

  it("isola as áreas de empresa e motoboy", () => {
    expect(canRoleAccessPath("COMPANY", "/app/empresa")).toBe(true);
    expect(canRoleAccessPath("COMPANY", "/app/motoboy")).toBe(false);
    expect(canRoleAccessPath("MOTOBOY", "/app/motoboy/corrida")).toBe(true);
    expect(canRoleAccessPath("MOTOBOY", "/app/empresa")).toBe(false);
  });

  it("lança erro ao negar uma função", () => {
    expect(() => assertRole(sessionUser("COMPANY"), ["ADMIN"])).toThrow(
      ForbiddenError,
    );
    expect(() => assertRole(sessionUser("ADMIN"), ["ADMIN"])).not.toThrow();
  });
});
