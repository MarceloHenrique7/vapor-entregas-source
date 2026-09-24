import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("integração do Meta Pixel", () => {
  it("leva o CTA principal diretamente ao cadastro completo da empresa", async () => {
    const landing = await source(
      "src/components/prelaunch/prelaunch-landing.tsx",
    );
    expect(landing).toContain('href="/cadastro/empresa"');
    expect(landing).toContain("Criar conta grátis");
    expect(landing).not.toContain("PreRegistrationForm");
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
