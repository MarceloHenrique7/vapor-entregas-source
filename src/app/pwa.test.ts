import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "./manifest";
import { isIosDevice } from "@/components/pwa/use-pwa-install";

describe("PWA segura", () => {
  it("expõe manifest instalável com ícones any e maskable", () => {
    const value = manifest();
    expect(value.name).toBe("Vapor Entregas");
    expect(value.short_name).toBe("Vapor");
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/");
    expect(value.theme_color).toBe("#ea1d2c");
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/vapor-entregas-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/vapor-entregas-maskable-512.png",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ]),
    );
  });

  it("mantém todos os assets declarados no manifest disponíveis", async () => {
    const icons = manifest().icons ?? [];
    await Promise.all(
      icons.map((icon) =>
        readFile(join(process.cwd(), "public", String(icon.src))),
      ),
    );
  });

  it("não permite cache do service worker em APIs ou áreas privadas", async () => {
    const worker = await readFile(
      join(process.cwd(), "public", "sw.js"),
      "utf8",
    );
    expect(worker).toContain('pathname.startsWith("/api/")');
    expect(worker).toContain('pathname.startsWith("/app/")');
    expect(worker).toContain('pathname.startsWith("/admin")');
    expect(worker).toContain('"vapor-entregas-static-v4"');
    expect(worker).toMatch(/private\|no-store/);
    expect(worker).not.toMatch(
      /passwordHash|cpfEncrypted|rgEncrypted|tokenHash/i,
    );
  });

  it("registra o service worker mesmo quando o load já aconteceu", async () => {
    const registration = await readFile(
      join(process.cwd(), "src/components/pwa/pwa-registration.tsx"),
      "utf8",
    );
    expect(registration).toContain('document.readyState === "complete"');
    expect(registration).toContain('window.addEventListener("load", register');
    expect(registration).toContain(
      'window.addEventListener("beforeinstallprompt"',
    );
  });

  it("detecta iPhone, iPad e iPadOS sem confundir desktop comum", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone)", "iPhone", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0", "MacIntel", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0", "Win32", 0)).toBe(false);
  });

  it("trata standalone, instalação concluída e instruções do iOS", async () => {
    const registration = await readFile(
      join(process.cwd(), "src/components/pwa/pwa-registration.tsx"),
      "utf8",
    );
    const hook = await readFile(
      join(process.cwd(), "src/components/pwa/use-pwa-install.ts"),
      "utf8",
    );
    const button = await readFile(
      join(process.cwd(), "src/components/pwa/install-app-button.tsx"),
      "utf8",
    );
    expect(hook).toContain('matchMedia("(display-mode: standalone)")');
    expect(registration).toContain('window.addEventListener("appinstalled"');
    expect(button).toMatch(/Adicionar à\s+Tela\s+de\s+Início/);
    expect(button).toContain("Instalar Vapor");
  });

  it("mantém destaques temporários compatíveis com redução de movimento", async () => {
    const styles = await readFile(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    expect(styles).toContain(
      "animation: opportunity-highlight 1.25s ease-out 2",
    );
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-iteration-count: 1 !important");
  });

  it("destaca a nova oportunidade sem depender apenas da animação", async () => {
    const opportunities = await readFile(
      join(
        process.cwd(),
        "src/components/deliveries/motoboy-opportunities-list.tsx",
      ),
      "utf8",
    );
    expect(opportunities).toContain("NOVA");
    expect(opportunities).toContain("Aceitar entrega");
    expect(opportunities).toContain("new-opportunity-badge");
    expect(opportunities).toContain('aria-live="polite"');
  });

  it("mantém foco visível e feedback tátil nos CTAs", async () => {
    const button = await readFile(
      join(process.cwd(), "src/components/ui/button.tsx"),
      "utf8",
    );
    expect(button).toContain("focus-visible:ring");
    expect(button).toContain("active:scale-");
  });
});
