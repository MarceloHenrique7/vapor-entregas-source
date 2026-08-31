import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "./manifest";

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
});
