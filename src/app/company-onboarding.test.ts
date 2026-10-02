import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("onboarding simplificado de empresa", () => {
  it("expõe somente nome da empresa, WhatsApp e senha no cadastro inicial", async () => {
    const form = await source(
      "src/components/auth/company-registration-form.tsx",
    );
    expect(form).toContain('name="fantasyName"');
    expect(form).toContain('name="phone"');
    expect(form).toContain('name="password"');
    expect(form).not.toContain('name="email"');
    expect(form).not.toContain('name="legalDocument"');
    expect(form).not.toContain('name="responsibleName"');
    expect(form).not.toContain('name="passwordConfirmation"');
    expect(form).toContain("submitting.current");
  });

  it("encaminha a conta criada para localização e reaproveita o pré-cadastro", async () => {
    const form = await source(
      "src/components/auth/company-registration-form.tsx",
    );
    expect(form).toContain('readPrelaunchRegistrationDraft("COMPANY")');
    expect(form).toContain(
      'router.push("/app/empresa/configuracoes/localizacao")',
    );
    expect(form).not.toContain('"CompanyLocationConfigured"');

    const location = await source(
      "src/components/maps/company-location-form.tsx",
    );
    expect(location).toContain('"CompanyLocationConfigured"');
    expect(location).toContain("Criar primeira entrega");
  });

  it("aceita login legado por e-mail e novo login por WhatsApp", async () => {
    const schema = await source("src/server/auth/schemas.ts");
    const authentication = await source("src/server/auth/authenticate.ts");
    expect(schema).toContain("identifier:");
    expect(schema).toContain("email: normalizedEmail.optional()");
    expect(authentication).toContain('kind: "phone"');
    expect(authentication).toContain('kind: "email"');
  });

  it("usa migration MySQL incremental sem apagar dados", async () => {
    const migration = await source(
      "prisma/mysql/migrations/20260929120000_simplify_company_onboarding/migration.sql",
    );
    expect(migration).toContain("ALTER TABLE `users`");
    expect(migration).toContain("MODIFY `email` VARCHAR(254) NULL");
    expect(migration).toContain("ALTER TABLE `company_profiles`");
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
  });
});
