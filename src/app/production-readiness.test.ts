import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

describe("prontidão da experiência de produção", () => {
  it("mantém o menu móvel completo derivado da navegação de cada papel", async () => {
    const shell = await source("src/components/dashboard/dashboard-shell.tsx");
    expect(shell).toContain("navigation.map");
    expect(shell).toContain("Menu completo do painel");
    expect(shell).toContain("Sair da conta");
    expect(shell).toContain("InstallAppButton");
    expect(shell).toContain('router.replace("/entrar")');
  });

  it("usa um único capturador global do prompt de instalação", async () => {
    const registration = await source(
      "src/components/pwa/pwa-registration.tsx",
    );
    const hook = await source("src/components/pwa/use-pwa-install.ts");
    expect(registration).toContain("beforeinstallprompt");
    expect(hook).not.toContain("beforeinstallprompt");
  });

  it("mantém notificações persistentes, idempotentes e com SSE mais polling", async () => {
    const schema = await source("prisma/schema.prisma");
    const service = await source(
      "src/server/notifications/notification-service.ts",
    );
    const stream = await source("src/app/api/notifications/events/route.ts");
    const hook = await source(
      "src/components/notifications/use-notification-events.ts",
    );
    expect(schema).toContain("@@unique([userId, eventKey])");
    expect(service).toContain("skipDuplicates: true");
    expect(service).toContain("PLAN_PAYMENT_APPROVED");
    expect(service).toContain("targetUrl");
    expect(stream).toContain("event: notification");
    expect(hook).toContain("new EventSource");
    expect(hook).toContain("30_000");
  });

  it("oferece busca protegida com debounce, cancelamento e coordenadas exatas", async () => {
    const form = await source(
      "src/components/deliveries/new-delivery-form.tsx",
    );
    const route = await source("src/app/api/maps/suggestions/route.ts");
    expect(form).toContain("parseCoordinatesInput");
    expect(form).toContain("new AbortController");
    expect(form).toContain("}, 450)");
    expect(form).toContain("Salvar endereço do cliente");
    expect(form).toContain("Confira o pin no mapa antes de publicar");
    expect(form).toContain("slice(0, 5)");
    expect(route).toContain('requireRole(["COMPANY", "ADMIN"])');
    expect(route).toContain("enforceLocationRateLimit");
  });

  it("não expõe rotas internas na landing de pré-lançamento e mantém o gate default-deny", async () => {
    const landing = await source(
      "src/components/prelaunch/prelaunch-landing.tsx",
    );
    const policy = await source("src/server/prelaunch/policy.ts");
    const robots = await source("src/app/robots.ts");
    expect(landing).not.toMatch(/href=["']\/(?:app|admin|entrar|cadastro)/);
    expect(policy).toContain('return "BLOCKED"');
    expect(robots).toContain('disallow: ["/admin", "/app", "/api"');
  });
});
