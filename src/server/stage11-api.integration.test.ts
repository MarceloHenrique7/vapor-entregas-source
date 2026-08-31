import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SESSION_COOKIE_NAME } from "@/server/auth/session-constants";
import {
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/session-token";
import { getPrisma } from "@/server/db/prisma";

const enabled = process.env.RUN_API_INTEGRATION === "1";
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "");
const preRegistrationPhone = `+55879${suffix.replace(/\D/g, "").padEnd(8, "0").slice(0, 8)}`;
const userIds: string[] = [];
const cookiesByRole = new Map<string, string>();
let companyUserId = "";
let motoboyUserId = "";
let companyNotificationId = "";

function hash64(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function sessionCookie(userId: string) {
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

async function api(path: string, role: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: cookiesByRole.get(role) ?? "",
      ...(init.body
        ? { "Content-Type": "application/json", Origin: baseUrl }
        : {}),
      ...init.headers,
    },
  });
}

describe.skipIf(!enabled)(
  "ETAPA 11 — smoke autenticado de todas as APIs principais",
  () => {
    beforeAll(async () => {
      const company = await prisma.user.create({
        data: {
          name: "Empresa API Smoke",
          email: `api-company-${suffix}@example.test`,
          phone: `57${suffix.slice(0, 11)}`,
          passwordHash: "integration-only",
          role: "COMPANY",
          companyProfile: {
            create: {
              fantasyName: "Empresa API Smoke",
              documentType: "CNPJ",
              legalDocumentEncrypted: "protected",
              legalDocumentHash: hash64(`company-${suffix}`),
              legalDocumentLastDigits: suffix.slice(-4),
              city: "PETROLINA_PE",
              locations: {
                create: {
                  label: "Loja principal",
                  address: "Avenida Guararapes",
                  number: "120",
                  neighborhood: "Centro",
                  city: "PETROLINA_PE",
                  state: "PE",
                  latitude: -9.3891,
                  longitude: -40.5031,
                  isDefault: true,
                },
              },
            },
          },
        },
      });
      companyUserId = company.id;
      userIds.push(company.id);
      await prisma.subscription.create({
        data: {
          userId: company.id,
          planId: "15000000-0000-4000-8000-000000000002",
          status: "ACTIVE",
          monthlyPrice: 25,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      cookiesByRole.set("COMPANY", await sessionCookie(company.id));

      const motoboy = await prisma.user.create({
        data: {
          name: "Motoboy API Smoke",
          email: `api-motoboy-${suffix}@example.test`,
          phone: `58${suffix.slice(0, 11)}`,
          passwordHash: "integration-only",
          role: "MOTOBOY",
          motoboyProfile: {
            create: {
              cpfEncrypted: "protected",
              cpfHash: hash64(`cpf-${suffix}`),
              cpfLastDigits: "00",
              rgEncrypted: "protected",
              rgHash: hash64(`rg-${suffix}`),
              birthDate: new Date("1990-01-01T00:00:00Z"),
              city: "PETROLINA_PE",
              isOnline: true,
              onlineSince: new Date(),
              lastLocationAt: new Date(),
              lastLatitude: -9.3891,
              lastLongitude: -40.5031,
              legalResponsibilityAcceptedAt: new Date(),
              intermediationAcceptedAt: new Date(),
            },
          },
        },
      });
      motoboyUserId = motoboy.id;
      userIds.push(motoboy.id);
      await prisma.subscription.create({
        data: {
          userId: motoboy.id,
          planId: "15000000-0000-4000-8000-000000000001",
          status: "ACTIVE",
          monthlyPrice: 20,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      cookiesByRole.set("MOTOBOY", await sessionCookie(motoboy.id));

      const admin = await prisma.user.create({
        data: {
          name: "Admin API Smoke",
          email: `api-admin-${suffix}@example.test`,
          phone: `59${suffix.slice(0, 11)}`,
          passwordHash: "integration-only",
          role: "ADMIN",
        },
      });
      userIds.push(admin.id);
      cookiesByRole.set("ADMIN", await sessionCookie(admin.id));
      const notification = await prisma.notification.create({
        data: {
          userId: company.id,
          type: "ADMIN_NOTICE",
          title: "Teste de API",
          message: "Notificação efêmera do smoke test.",
        },
      });
      companyNotificationId = notification.id;
    });

    afterAll(async () => {
      if (!enabled) return;
      await prisma.preRegistration.deleteMany({
        where: { normalizedPhone: preRegistrationPhone },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.subscriptionEvent.deleteMany({
        where: { subscription: { userId: { in: userIds } } },
      });
      await prisma.subscription.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    it("não retorna 500 nas APIs operacionais, reputação, conta e notificações", async () => {
      const checks = [
        ["COMPANY", "/api/deliveries"],
        ["COMPANY", "/api/deliveries/history"],
        ["COMPANY", "/api/company/history"],
        ["COMPANY", "/api/company/motoboys"],
        ["COMPANY", "/api/ratings"],
        ["COMPANY", "/api/favorites"],
        ["COMPANY", "/api/reports"],
        ["COMPANY", "/api/account/profile"],
        ["COMPANY", "/api/auth/session"],
        ["COMPANY", "/api/notifications"],
        ["COMPANY", "/api/subscriptions/me"],
        ["MOTOBOY", "/api/deliveries/opportunities"],
        ["MOTOBOY", "/api/deliveries/current"],
        ["MOTOBOY", "/api/deliveries/history"],
        ["MOTOBOY", "/api/ratings"],
        ["MOTOBOY", "/api/reports"],
        ["MOTOBOY", "/api/motoboy/presence"],
        ["MOTOBOY", "/api/notifications"],
        ["MOTOBOY", "/api/subscriptions/me"],
      ] as const;
      for (const [role, path] of checks) {
        const response = await api(path, role);
        const body = await response.text();
        expect(response.status, `${path}: ${body}`).toBe(200);
        expect(body).not.toMatch(
          /passwordHash|tokenHash|cpfEncrypted|rgEncrypted|secret/i,
        );
      }
    });

    it("protege administração, paginação e IDOR de notificações", async () => {
      const adminChecks = [
        "/api/admin/dashboard",
        "/api/admin/deliveries",
        "/api/admin/reports",
        "/api/admin/audit",
        "/api/admin/pricing-rules",
        "/api/admin/subscription-plans",
        "/api/admin/pre-registrations",
        `/api/admin/users/${companyUserId}`,
      ];
      for (const path of adminChecks) {
        const response = await api(path, "ADMIN");
        expect(response.status, path).toBe(200);
      }
      const search = await api("/api/admin/users/search", "ADMIN", {
        method: "POST",
        body: JSON.stringify({ page: 1, pageSize: 20, query: "API Smoke" }),
      });
      expect(search.status).toBe(200);
      const quote = await api("/api/deliveries/quote", "COMPANY", {
        method: "POST",
        body: JSON.stringify({
          destinationLatitude: -9.401,
          destinationLongitude: -40.51,
          destinationCity: "PETROLINA_PE",
        }),
      });
      expect(quote.status).toBe(200);
      expect(await quote.json()).toMatchObject({
        quote: {
          distanceMethod: "STRAIGHT_LINE",
          suggestedPrice: expect.any(Number),
        },
      });
      expect((await api("/api/admin/dashboard", "COMPANY")).status).toBe(403);
      expect(
        (await api("/api/admin/subscription-plans", "MOTOBOY")).status,
      ).toBe(403);
      expect((await api("/api/subscriptions/me", "ANONYMOUS")).status).toBe(
        401,
      );
      expect((await api("/api/company/history", "MOTOBOY")).status).toBe(403);
      expect((await api("/api/company/history", "ADMIN")).status).toBe(403);
      expect((await api("/api/company/history", "ANONYMOUS")).status).toBe(401);
      expect((await api("/api/company/motoboys", "MOTOBOY")).status).toBe(403);
      const unknownDelivery = "00000000-0000-4000-8000-000000000001";
      const unknownExtra = "00000000-0000-4000-8000-000000000002";
      expect(
        (
          await api(`/api/deliveries/${unknownDelivery}/extras`, "COMPANY", {
            method: "POST",
            body: JSON.stringify({
              type: "WAITING",
              description: "Espera informada no teste",
            }),
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await api(`/api/deliveries/${unknownDelivery}/extras`, "ADMIN", {
            method: "POST",
            body: JSON.stringify({
              type: "WAITING",
              description: "Espera informada no teste",
            }),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            `/api/deliveries/${unknownDelivery}/extras/${unknownExtra}/respond`,
            "MOTOBOY",
            {
              method: "POST",
              body: JSON.stringify({ decision: "ACKNOWLEDGED" }),
            },
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await api(
            `/api/notifications/${companyNotificationId}/read`,
            "MOTOBOY",
            {
              method: "PATCH",
              body: JSON.stringify({}),
            },
          )
        ).status,
      ).toBe(404);
    });

    it("cria, deduplica e administra pré-cadastros sem listagem pública", async () => {
      const payload = {
        name: "Interessado API Smoke",
        phone: preRegistrationPhone,
        type: "MOTOBOY",
      };
      const first = await fetch(`${baseUrl}/api/pre-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: baseUrl },
        body: JSON.stringify(payload),
      });
      expect(first.status).toBe(201);
      await expect(first.json()).resolves.toMatchObject({ status: "created" });

      const duplicate = await fetch(`${baseUrl}/api/pre-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: baseUrl },
        body: JSON.stringify(payload),
      });
      expect(duplicate.status).toBe(200);
      await expect(duplicate.json()).resolves.toMatchObject({
        status: "existing",
      });
      expect((await fetch(`${baseUrl}/api/pre-registration`)).status).toBe(405);

      const search = await api("/api/admin/pre-registrations/search", "ADMIN", {
        method: "POST",
        body: JSON.stringify({
          page: 1,
          pageSize: 20,
          query: "Interessado API Smoke",
        }),
      });
      expect(search.status).toBe(200);
      await expect(search.json()).resolves.toMatchObject({
        total: 1,
        items: [
          {
            name: "Interessado API Smoke",
            phone: expect.any(String),
            type: "MOTOBOY",
          },
        ],
      });
      expect(
        (
          await api("/api/admin/pre-registrations/search", "COMPANY", {
            method: "POST",
            body: JSON.stringify({ page: 1, pageSize: 20 }),
          })
        ).status,
      ).toBe(403);
    });

    it("bloqueia somente novas operações quando a assinatura não está ativa", async () => {
      await prisma.subscription.updateMany({
        where: { userId: { in: [companyUserId, motoboyUserId] } },
        data: { status: "EXPIRED", currentPeriodEnd: new Date() },
      });
      try {
        const companyPublish = await api("/api/deliveries", "COMPANY", {
          method: "POST",
          body: JSON.stringify({}),
        });
        expect(companyPublish.status).toBe(402);
        await expect(companyPublish.json()).resolves.toMatchObject({
          code: "SUBSCRIPTION_REQUIRED",
        });
        expect(
          (await api("/api/deliveries/opportunities", "MOTOBOY")).status,
        ).toBe(200);
        const accept = await api(
          "/api/deliveries/00000000-0000-4000-8000-000000000001/accept",
          "MOTOBOY",
          { method: "POST", body: JSON.stringify({}) },
        );
        expect(accept.status).toBe(402);
        expect(
          (
            await api("/api/motoboy/presence/online", "MOTOBOY", {
              method: "POST",
              body: JSON.stringify({ latitude: -9.3891, longitude: -40.5031 }),
            })
          ).status,
        ).toBe(402);
        expect((await api("/api/deliveries/history", "COMPANY")).status).toBe(
          200,
        );
        expect((await api("/api/deliveries/history", "MOTOBOY")).status).toBe(
          200,
        );
      } finally {
        await prisma.subscription.updateMany({
          where: { userId: { in: [companyUserId, motoboyUserId] } },
          data: {
            status: "ACTIVE",
            currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
          },
        });
      }
    });

    it("renderiza as principais telas públicas, operacionais e administrativas sem 500", async () => {
      const pages = [
        ["COMPANY", "/app/empresa"],
        ["COMPANY", "/app/empresa/entregas"],
        ["COMPANY", "/app/empresa/historico"],
        ["COMPANY", "/app/empresa/motoboys"],
        ["COMPANY", "/app/empresa/configuracoes/localizacao"],
        ["COMPANY", "/app/empresa/notificacoes"],
        ["COMPANY", "/app/empresa/assinatura"],
        ["MOTOBOY", "/app/motoboy"],
        ["MOTOBOY", "/app/motoboy/oportunidades"],
        ["MOTOBOY", "/app/motoboy/corrida"],
        ["MOTOBOY", "/app/motoboy/historico"],
        ["MOTOBOY", "/app/motoboy/notificacoes"],
        ["MOTOBOY", "/app/motoboy/assinatura"],
        ["ADMIN", "/admin"],
        ["ADMIN", "/admin/usuarios"],
        ["ADMIN", "/admin/entregas"],
        ["ADMIN", "/admin/denuncias"],
        ["ADMIN", "/admin/auditoria"],
        ["ADMIN", "/admin/precificacao"],
        ["ADMIN", "/admin/assinaturas"],
        ["ADMIN", "/admin/pre-cadastros"],
      ] as const;
      for (const [role, path] of pages) {
        const response = await api(path, role);
        expect(response.status, path).toBe(200);
        expect(await response.text()).not.toMatch(/Internal Server Error/);
      }
      for (const path of [
        "/",
        "/entrar",
        "/cadastro/empresa",
        "/cadastro/motoboy",
        "/termos",
        "/regras",
        "/privacidade",
        "/planos",
        "/manifest.webmanifest",
        "/sw.js",
        "/api/subscriptions/plans",
      ]) {
        const response = await fetch(`${baseUrl}${path}`);
        expect(response.status, path).toBe(200);
      }
    });
  },
  45_000,
);
