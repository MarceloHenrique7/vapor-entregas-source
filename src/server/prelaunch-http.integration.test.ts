import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashPassword } from "@/server/auth/password";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-constants";
import {
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/session-token";
import { getPrisma } from "@/server/db/prisma";

const enabled = process.env.RUN_PRELAUNCH_INTEGRATION === "1";
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
const password = "Teste-Gate-2026!";
const testUserId = "17000000-0000-4000-8000-000000000001";
const commonCompanyId = "17000000-0000-4000-8000-000000000002";
const adminUserId = "17000000-0000-4000-8000-000000000003";
const commonMotoboyId = "17000000-0000-4000-8000-000000000004";
const userIds = [testUserId, commonCompanyId, adminUserId, commonMotoboyId];
const preRegistrationPhone = "+5587999999917";
const cookies = new Map<string, string>();
const prisma = getPrisma();

type Identity = "TEST" | "COMMON_COMPANY" | "COMMON_MOTOBOY" | "ADMIN";

async function createCookie(userId: string) {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function request(
  path: string,
  identity?: Identity,
  init: RequestInit = {},
) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      ...(identity ? { Cookie: cookies.get(identity) ?? "" } : {}),
      ...(init.body
        ? { "Content-Type": "application/json", Origin: baseUrl }
        : {}),
      ...init.headers,
    },
  });
}

async function login(
  endpoint: "/api/prelaunch/login/admin" | "/api/prelaunch/login/test",
  email: string,
) {
  return request(endpoint, undefined, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

describe.skipIf(!enabled)(
  "gate global HTTP do pré-lançamento",
  () => {
    beforeAll(async () => {
      expect(process.env.PRELAUNCH_MODE).toBe("true");
      expect(process.env.PRELAUNCH_TEST_USER_IDS?.split(",")).toContain(
        testUserId,
      );
      await prisma.preRegistration.deleteMany({
        where: { normalizedPhone: preRegistrationPhone },
      });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      const passwordHash = await hashPassword(password);
      await prisma.user.createMany({
        data: [
          {
            id: testUserId,
            name: "Conta teste pré-lançamento",
            email: "prelaunch-test@example.test",
            phone: "87000000001",
            passwordHash,
            role: "COMPANY",
          },
          {
            id: commonCompanyId,
            name: "Empresa comum pré-lançamento",
            email: "prelaunch-company@example.test",
            phone: "87000000002",
            passwordHash,
            role: "COMPANY",
          },
          {
            id: adminUserId,
            name: "Admin pré-lançamento",
            email: "prelaunch-admin@example.test",
            phone: "87000000003",
            passwordHash,
            role: "ADMIN",
          },
          {
            id: commonMotoboyId,
            name: "Motoboy comum pré-lançamento",
            email: "prelaunch-motoboy@example.test",
            phone: "87000000004",
            passwordHash,
            role: "MOTOBOY",
          },
        ],
      });
      cookies.set("TEST", await createCookie(testUserId));
      cookies.set("COMMON_COMPANY", await createCookie(commonCompanyId));
      cookies.set("COMMON_MOTOBOY", await createCookie(commonMotoboyId));
      cookies.set("ADMIN", await createCookie(adminUserId));
    });

    afterAll(async () => {
      if (!enabled) return;
      await prisma.preRegistration.deleteMany({
        where: { normalizedPhone: preRegistrationPhone },
      });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    it("permite somente landing, formulário, documentos e pré-cadastro ao visitante", async () => {
      const landing = await request("/");
      expect(landing.status).toBe(200);
      const html = await landing.text();
      expect(html).toContain("Vapor Entregas");
      expect(html).toContain("Pedido pronto. Entrega sem complicação.");
      expect(html).toContain("25 de setembro");
      expect((await request("/form")).status).toBe(200);
      expect((await request("/termos")).status).toBe(200);
      expect((await request("/privacidade")).status).toBe(200);

      const registration = await request("/api/pre-registration", undefined, {
        method: "POST",
        body: JSON.stringify({
          name: "Interessado Gate Global",
          phone: preRegistrationPhone,
          type: "MOTOBOY",
        }),
      });
      expect(registration.status).toBe(201);
      await expect(registration.json()).resolves.toMatchObject({
        status: "created",
      });
    });

    it("redireciona toda rota não autorizada para a landing, inclusive aliases e query", async () => {
      const blockedPages = [
        "/login",
        "/register",
        "/cadastro",
        "/cadastro/empresa",
        "/entrar",
        "/entrar?next=/app/empresa",
        "/app/empresa",
        "/app/motoboy",
        "/admin",
        "/oportunidades/qualquer",
        "/historico/qualquer",
        "/assinatura/qualquer",
        "/notificacoes/qualquer",
        "/pre-lancamento",
        "/regras",
      ];
      for (const path of blockedPages) {
        const response = await request(path);
        expect(response.status, path).toBe(307);
        expect(response.headers.get("location"), path).toBe("/");
      }
    });

    it("bloqueia APIs privadas e o login público antes do route handler", async () => {
      for (const path of [
        "/api/auth/session",
        "/api/deliveries",
        "/api/company/history",
        "/api/motoboy/presence",
      ]) {
        expect((await request(path)).status, path).toBe(401);
      }
      const publicLogin = await request("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({
          email: "prelaunch-admin@example.test",
          password,
        }),
      });
      expect(publicLogin.status).toBe(401);
      expect((await request("/api/pre-registration")).status).toBe(401);
    });

    it("bloqueia COMPANY e MOTOBOY comuns mesmo com sessão válida", async () => {
      const attempts: Array<[Identity, string]> = [
        ["COMMON_COMPANY", "/app/empresa"],
        ["COMMON_COMPANY", "/admin/acesso"],
        ["COMMON_MOTOBOY", "/app/motoboy"],
        ["COMMON_MOTOBOY", "/acesso/teste"],
      ];
      for (const [identity, path] of attempts) {
        const response = await request(path, identity);
        expect(response.status, `${identity} ${path}`).toBe(307);
        expect(response.headers.get("location")).toBe("/");
      }
      expect(
        (await request("/api/auth/session", "COMMON_COMPANY")).status,
      ).toBe(403);
      expect(
        (await request("/api/auth/session", "COMMON_MOTOBOY")).status,
      ).toBe(403);
    });

    it("autentica ADMIN somente pela entrada administrativa", async () => {
      expect((await request("/admin/acesso")).status).toBe(200);
      const accepted = await login(
        "/api/prelaunch/login/admin",
        "prelaunch-admin@example.test",
      );
      expect(accepted.status).toBe(200);
      expect(accepted.headers.get("set-cookie")).toContain(
        `${SESSION_COOKIE_NAME}=`,
      );
      const rejected = await login(
        "/api/prelaunch/login/admin",
        "prelaunch-company@example.test",
      );
      expect(rejected.status).toBe(401);
      expect(rejected.headers.get("set-cookie")).toBeNull();
      expect((await request("/admin", "ADMIN")).status).toBe(200);
    });

    it("autentica apenas UUID de teste explicitamente listado", async () => {
      expect((await request("/acesso/teste")).status).toBe(200);
      const accepted = await login(
        "/api/prelaunch/login/test",
        "prelaunch-test@example.test",
      );
      expect(accepted.status).toBe(200);
      expect(accepted.headers.get("set-cookie")).toContain(
        `${SESSION_COOKIE_NAME}=`,
      );
      const rejected = await login(
        "/api/prelaunch/login/test",
        "prelaunch-company@example.test",
      );
      expect(rejected.status).toBe(401);
      expect(rejected.headers.get("set-cookie")).toBeNull();
      expect((await request("/app/empresa", "TEST")).status).toBe(200);
    });

    it("preserva o RBAC após ADMIN ou conta de teste ultrapassarem o gate", async () => {
      expect((await request("/api/admin/dashboard", "TEST")).status).toBe(403);
      expect((await request("/api/admin/dashboard", "ADMIN")).status).toBe(200);
      expect((await request("/api/company/history", "ADMIN")).status).toBe(403);
      const wrongRolePage = await request("/app/motoboy", "TEST");
      expect(wrongRolePage.status).toBe(200);
      expect(await wrongRolePage.text()).toContain("auth=forbidden");
    });
  },
  45_000,
);
