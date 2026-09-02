import { describe, expect, it } from "vitest";

import {
  canBypassPrelaunch,
  evaluatePrelaunchGate,
  isPrelaunchPublicRequest,
  PRELAUNCH_PUBLIC_API_METHODS,
  PRELAUNCH_PUBLIC_ASSETS,
  PRELAUNCH_PUBLIC_PAGES,
} from "./policy";

const activeCompany = {
  id: "17000000-0000-4000-8000-000000000001",
  role: "COMPANY" as const,
  status: "ACTIVE" as const,
};

describe("política do pré-lançamento", () => {
  it("não aplica o gate quando a flag está desativada", () => {
    expect(
      evaluatePrelaunchGate({
        enabled: false,
        pathname: "/app/empresa",
        method: "GET",
        user: null,
        testUserIds: [],
      }),
    ).toBe("DISABLED");
  });

  it("mantém somente a allowlist explícita pública", () => {
    for (const path of PRELAUNCH_PUBLIC_PAGES) {
      expect(isPrelaunchPublicRequest(path, "GET"), path).toBe(true);
    }
    for (const path of PRELAUNCH_PUBLIC_ASSETS) {
      expect(isPrelaunchPublicRequest(path, "GET"), path).toBe(true);
    }
    for (const [path, methods] of PRELAUNCH_PUBLIC_API_METHODS) {
      for (const method of methods) {
        expect(isPrelaunchPublicRequest(path, method), path).toBe(true);
      }
    }
    expect(isPrelaunchPublicRequest("/api/pre-registration", "POST")).toBe(
      true,
    );
    expect(isPrelaunchPublicRequest("/api/pre-registration", "GET")).toBe(
      false,
    );
    expect(isPrelaunchPublicRequest("/api/auth/login", "POST")).toBe(false);
    expect(isPrelaunchPublicRequest("/api/webhooks/mercadopago", "POST")).toBe(
      true,
    );
    expect(
      isPrelaunchPublicRequest("/api/subscriptions/checkout", "POST"),
    ).toBe(false);
    expect(
      isPrelaunchPublicRequest("/api/subscriptions/payments/status", "POST"),
    ).toBe(false);
    expect(isPrelaunchPublicRequest("/api/auth/register/company", "POST")).toBe(
      false,
    );
    expect(isPrelaunchPublicRequest("/pre-lancamento", "GET")).toBe(false);
    expect(isPrelaunchPublicRequest("/regras", "GET")).toBe(false);
  });

  it("não libera variações de prefixo, barra ou query como outro pathname", () => {
    expect(isPrelaunchPublicRequest("/form/extra", "GET")).toBe(false);
    expect(
      isPrelaunchPublicRequest("/api/pre-registration/extra", "POST"),
    ).toBe(false);
    expect(
      isPrelaunchPublicRequest("/icons/vapor-entregas-192.png/extra", "GET"),
    ).toBe(false);
  });

  it("bloqueia visitante e usuário comum durante o pré-lançamento", () => {
    for (const user of [null, activeCompany]) {
      expect(
        evaluatePrelaunchGate({
          enabled: true,
          pathname: "/app/empresa?tentativa=1",
          method: "GET",
          user,
          testUserIds: [],
        }),
      ).toBe("BLOCKED");
    }
  });

  it("autoriza ADMIN ativo e usuário de teste explicitamente liberado", () => {
    const admin = { ...activeCompany, id: "admin", role: "ADMIN" as const };
    expect(canBypassPrelaunch(admin, [])).toBe(true);
    expect(canBypassPrelaunch(activeCompany, [activeCompany.id])).toBe(true);
  });

  it("não permite bypass de conta suspensa, mesmo listada como teste", () => {
    expect(
      canBypassPrelaunch({ ...activeCompany, status: "SUSPENDED" }, [
        activeCompany.id,
      ]),
    ).toBe(false);
  });
});
