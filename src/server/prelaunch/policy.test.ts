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

const activeMotoboy = {
  ...activeCompany,
  id: "17000000-0000-4000-8000-000000000002",
  role: "MOTOBOY" as const,
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
    expect(isPrelaunchPublicRequest("/api/auth/login", "POST")).toBe(true);
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
      true,
    );
    expect(isPrelaunchPublicRequest("/api/auth/register/motoboy", "POST")).toBe(
      true,
    );
    expect(isPrelaunchPublicRequest("/pre-lancamento", "GET")).toBe(false);
    expect(isPrelaunchPublicRequest("/regras", "GET")).toBe(true);
    const token = "a".repeat(43);
    expect(isPrelaunchPublicRequest(`/r/${token}`, "GET")).toBe(true);
    expect(isPrelaunchPublicRequest(`/api/tracking/${token}`, "GET")).toBe(
      true,
    );
    expect(isPrelaunchPublicRequest(`/api/tracking/${token}`, "POST")).toBe(
      false,
    );
    expect(isPrelaunchPublicRequest("/r/curto", "GET")).toBe(false);
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
    const protectedPaths = [
      "/app/empresa?tentativa=1",
      "/app/motoboy",
      "/admin",
      "/api/notifications",
      "/api/subscriptions/checkout",
    ];
    for (const user of [null, activeCompany]) {
      for (const pathname of protectedPaths) {
        expect(
          evaluatePrelaunchGate({
            enabled: true,
            pathname,
            method: pathname.startsWith("/api/") ? "POST" : "GET",
            user,
            testUserIds: [],
          }),
          pathname,
        ).toBe("BLOCKED");
      }
    }
  });

  it("libera cadastro e login públicos, mas exige sessão para preparação", () => {
    for (const pathname of [
      "/entrar",
      "/cadastro/empresa",
      "/cadastro/motoboy",
    ]) {
      expect(
        evaluatePrelaunchGate({
          enabled: true,
          pathname,
          method: "GET",
          user: null,
          testUserIds: [],
        }),
      ).toBe("PUBLIC");
    }
    expect(
      evaluatePrelaunchGate({
        enabled: true,
        pathname: "/cadastro/concluido",
        method: "GET",
        user: null,
        testUserIds: [],
      }),
    ).toBe("BLOCKED");
  });

  it("limita contas comuns ao onboarding do próprio papel", () => {
    const allowed: Array<
      [typeof activeCompany | typeof activeMotoboy, string, string]
    > = [
      [activeCompany, "/cadastro/concluido", "GET"],
      [activeCompany, "/app/empresa/configuracoes", "GET"],
      [activeCompany, "/app/empresa/configuracoes/localizacao", "GET"],
      [activeCompany, "/api/company/location", "PUT"],
      [activeMotoboy, "/app/motoboy/configuracoes", "GET"],
      [activeMotoboy, "/api/account/profile", "PATCH"],
    ];
    for (const [user, pathname, method] of allowed) {
      expect(
        evaluatePrelaunchGate({
          enabled: true,
          pathname,
          method,
          user,
          testUserIds: [],
        }),
        pathname,
      ).toBe("PREPARATION");
    }
    expect(
      evaluatePrelaunchGate({
        enabled: true,
        pathname: "/app/empresa/configuracoes/localizacao",
        method: "GET",
        user: activeMotoboy,
        testUserIds: [],
      }),
    ).toBe("BLOCKED");
    expect(
      evaluatePrelaunchGate({
        enabled: true,
        pathname: "/api/deliveries",
        method: "POST",
        user: activeCompany,
        testUserIds: [],
      }),
    ).toBe("BLOCKED");
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
