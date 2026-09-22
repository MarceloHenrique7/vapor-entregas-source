import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("integração do Meta Pixel", () => {
  it("deixa Empresa selecionada por padrão no pré-cadastro", async () => {
    const form = await source(
      "src/components/prelaunch/pre-registration-form.tsx",
    );
    expect(form).toContain('useState<AccountType>("COMPANY")');
    expect(form.indexOf('(["COMPANY", "MOTOBOY"]')).toBeGreaterThan(-1);
  });

  it("dispara Lead somente para pré-cadastro criado", async () => {
    const form = await source(
      "src/components/prelaunch/pre-registration-form.tsx",
    );
    expect(form).toContain('if (body.status === "created")');
    expect(form).toContain('"Lead"');
    expect(form).toContain('source: "prelaunch_form"');
  });

  it("dispara cadastro completo após a resposta bem-sucedida", async () => {
    const company = await source(
      "src/components/auth/company-registration-form.tsx",
    );
    const motoboy = await source(
      "src/components/auth/motoboy-registration-form.tsx",
    );
    for (const form of [company, motoboy]) {
      expect(form.indexOf("if (!response.ok)")).toBeLessThan(
        form.indexOf('"CompleteRegistration"'),
      );
      expect(form).toContain('platform: "vapor"');
    }
    expect(company).toContain('"CompanyRegistrationCompleted"');
  });

  it("não carrega nem dispara o Pixel em links públicos de tracking", async () => {
    const pixel = await source("src/components/analytics/meta-pixel.tsx");
    expect(pixel).toContain('pathname.startsWith("/r/")');
    expect(pixel).toContain("!sensitiveRoute");
  });
});
