import { describe, expect, it } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { AdminActionConflictError } from "./errors";
import {
  adminIdSchema,
  deliverySearchSchema,
  reportStatusActionSchema,
  userSearchSchema,
  userStatusActionSchema,
} from "./schemas";
import {
  administrativeActionForStatus,
  assertAdminAccess,
  assertModerationTarget,
  canTransitionReport,
  hasOperationalAccess,
} from "./policy";

const admin = {
  userId: "3bc85ce1-9cdb-40a7-a435-2c9b5ad32d10",
  role: "ADMIN",
  status: "ACTIVE",
} as const;

describe("políticas administrativas", () => {
  it("permite ADMIN ativo e rejeita motoboy, empresa, suspenso e não autenticado", () => {
    expect(() => assertAdminAccess(admin)).not.toThrow();
    expect(() => assertAdminAccess({ ...admin, role: "MOTOBOY" })).toThrow(
      ForbiddenError,
    );
    expect(() => assertAdminAccess({ ...admin, role: "COMPANY" })).toThrow(
      ForbiddenError,
    );
    expect(() => assertAdminAccess({ ...admin, status: "SUSPENDED" })).toThrow(
      ForbiddenError,
    );
    expect(() => assertAdminAccess(null)).toThrow(UnauthenticatedError);
  });

  it("impede automoderação, alteração de outro admin e IDs arbitrários", () => {
    expect(() =>
      assertModerationTarget(admin.userId, { id: admin.userId, role: "ADMIN" }),
    ).toThrow(AdminActionConflictError);
    expect(() =>
      assertModerationTarget(admin.userId, {
        id: "9e04f285-c07d-41e5-92e9-152cc885f24a",
        role: "ADMIN",
      }),
    ).toThrow(AdminActionConflictError);
    expect(adminIdSchema.safeParse("../outro-usuario").success).toBe(false);
    expect(() =>
      assertModerationTarget(admin.userId, {
        id: "9e04f285-c07d-41e5-92e9-152cc885f24a",
        role: "MOTOBOY",
        status: "DELETED",
      }),
    ).toThrow(AdminActionConflictError);
  });

  it("mapeia suspensão, banimento e reativação para auditoria", () => {
    expect(administrativeActionForStatus("SUSPENDED")).toBe("USER_SUSPENDED");
    expect(administrativeActionForStatus("BLOCKED")).toBe("USER_BANNED");
    expect(administrativeActionForStatus("ACTIVE")).toBe("USER_REACTIVATED");
  });

  it("bloqueia acesso operacional para conta suspensa ou banida", () => {
    expect(hasOperationalAccess("ACTIVE")).toBe(true);
    expect(hasOperationalAccess("SUSPENDED")).toBe(false);
    expect(hasOperationalAccess("BLOCKED")).toBe(false);
  });

  it("aceita somente o fluxo de moderação de denúncia permitido, incluindo reabertura", () => {
    expect(canTransitionReport("OPEN", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionReport("UNDER_REVIEW", "RESOLVED")).toBe(true);
    expect(canTransitionReport("UNDER_REVIEW", "DISMISSED")).toBe(true);
    expect(canTransitionReport("RESOLVED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionReport("OPEN", "RESOLVED")).toBe(false);
  });

  it("valida motivos de moderação e notas privadas", () => {
    expect(
      userStatusActionSchema.safeParse({ status: "SUSPENDED", reason: "curto" })
        .success,
    ).toBe(false);
    expect(
      userStatusActionSchema.safeParse({
        status: "BLOCKED",
        reason: "Tentativa de fraude confirmada",
      }).success,
    ).toBe(true);
    expect(
      reportStatusActionSchema.safeParse({
        status: "RESOLVED",
        reason: "Caso analisado",
        adminNotes: "Nota privada",
      }).success,
    ).toBe(true);
  });

  it("limita paginação e valida filtros de usuários e entregas", () => {
    expect(userSearchSchema.parse({ page: 2, pageSize: 20 }).page).toBe(2);
    expect(userSearchSchema.safeParse({ page: 1, pageSize: 500 }).success).toBe(
      false,
    );
    expect(
      deliverySearchSchema.safeParse({
        status: "COMPLETED",
        page: 1,
        pageSize: 20,
      }).success,
    ).toBe(true);
    expect(
      deliverySearchSchema.safeParse({
        status: "INVENTED",
        page: 1,
        pageSize: 20,
      }).success,
    ).toBe(false);
  });
});
