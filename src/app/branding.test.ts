import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const oldPublicBrand =
  /Movvi(?: Entregas)?|Entrega ?Vale|Vale Entregas|EntregaVale/i;

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

describe("identidade Vapor Entregas", () => {
  it("publica metadata raiz, Open Graph e Twitter com a nova marca", async () => {
    const layout = await source("src/app/layout.tsx");
    expect(layout).toContain('default: "Vapor Entregas"');
    expect(layout).toContain('applicationName: "Vapor Entregas"');
    expect(layout).toContain("openGraph:");
    expect(layout).toContain("twitter:");
    expect(layout).toContain('themeColor: "#ea1d2c"');
    expect(layout).not.toMatch(oldPublicBrand);
  });

  it("não exibe marcas anteriores nos principais pontos públicos", async () => {
    const files = [
      "src/app/page.tsx",
      "src/app/entrar/page.tsx",
      "src/app/termos/page.tsx",
      "src/app/privacidade/page.tsx",
      "src/components/prelaunch/prelaunch-landing.tsx",
      "src/components/marketing/footer.tsx",
      "src/components/brand/logo.tsx",
    ];
    const contents = await Promise.all(files.map(source));
    for (const content of contents) {
      expect(content).not.toMatch(oldPublicBrand);
    }
    expect(contents.join("\n")).toContain("Vapor Entregas");
  });

  it("reutiliza a logo nova em marketing e áreas autenticadas", async () => {
    const [logo, navbar, dashboard] = await Promise.all([
      source("src/components/brand/logo.tsx"),
      source("src/components/marketing/navbar.tsx"),
      source("src/components/dashboard/dashboard-shell.tsx"),
    ]);
    expect(logo).toContain("Vapor Entregas — início");
    expect(navbar).toContain("<Logo");
    expect(dashboard).toContain("<Logo");
  });

  it("posiciona a landing comercial para empresas sem promessas inventadas", async () => {
    const landing = await source(
      "src/components/prelaunch/prelaunch-landing.tsx",
    );
    expect(landing).toContain("Precisou de motoboy?");
    expect(landing).toContain("Coloca na Vapor");
    expect(landing).toContain("GRÁTIS PARA EMPRESAS");
    expect(landing).toContain('href="/cadastro/empresa"');
    expect(landing).toContain("Vapor Gestão Pro");
    expect(landing).toContain("Upgrade opcional");
    expect(landing).toContain("Petrolina/PE");
    expect(landing).toContain("Juazeiro/BA");
    expect(landing).not.toMatch(/pré-cadastro|pré-lançamento|lançamento em/i);
    expect(landing).not.toMatch(
      /entrega garantida|motoboys verificados|renda garantida/i,
    );
  });
});
