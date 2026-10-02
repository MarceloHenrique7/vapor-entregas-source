import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { RegistrationRepository } from "./register";
import { registerCompany, registerMotoboy } from "./register";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/config/product";

const key = randomBytes(32).toString("base64");
function repository(): RegistrationRepository {
  return {
    createMotoboy: vi.fn(async (data) => ({
      id: "motoboy-id",
      name: data.name,
      email: data.email,
      role: data.role,
    })),
    createCompany: vi.fn(async (data) => ({
      id: "company-id",
      name: data.name,
      email: data.email,
      role: data.role,
    })),
  };
}

describe("cadastro público", () => {
  it("cria motoboy com role fixa e documentos protegidos", async () => {
    const repo = repository();
    const registeredAt = new Date("2026-09-02T12:00:00.000Z");
    const user = await registerMotoboy(
      {
        name: "Maria da Silva",
        cpf: "529.982.247-25",
        rg: "12.345.678-9",
        phone: "(87) 99999-9999",
        email: "MARIA@EXAMPLE.COM",
        birthDate: "1995-05-20",
        city: "PETROLINA_PE",
        vehiclePlate: "abc-1234",
        password: "SenhaForte123",
        passwordConfirmation: "SenhaForte123",
        termsAccepted: true,
        privacyAccepted: true,
        legalResponsibilityAccepted: true,
        intermediationAccepted: true,
      },
      repo,
      key,
      registeredAt,
    );
    expect(user.role).toBe("MOTOBOY");
    expect(repo.createMotoboy).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "MOTOBOY",
        email: "maria@example.com",
        registeredAt,
        profile: expect.objectContaining({
          cpfLastDigits: "25",
          vehiclePlate: "ABC1234",
        }),
      }),
    );
    const payload = vi.mocked(repo.createMotoboy).mock.calls[0][0];
    expect(payload.profile.cpfEncrypted).not.toContain("52998224725");
    expect(payload.profile.rgEncrypted).not.toContain("12.345.678-9");
    expect(payload.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(payload.privacyVersion).toBe(CURRENT_PRIVACY_VERSION);
  });

  it("rejeita cadastro quando o aceite jurídico não foi dado", async () => {
    await expect(
      registerMotoboy(
        {
          name: "Maria da Silva",
          cpf: "529.982.247-25",
          rg: "12.345.678-9",
          phone: "(87) 99999-9999",
          email: "maria@example.com",
          birthDate: "1995-05-20",
          city: "PETROLINA_PE",
          password: "SenhaForte123",
          passwordConfirmation: "SenhaForte123",
          termsAccepted: false,
          privacyAccepted: true,
          legalResponsibilityAccepted: true,
          intermediationAccepted: true,
        },
        repository(),
        key,
      ),
    ).rejects.toThrow();
  });

  it("cria empresa somente com nome, WhatsApp e senha", async () => {
    const repo = repository();
    const input = {
      fantasyName: "Mercado do Vale",
      phone: "87999999999",
      password: "segredo8",
    };
    const user = await registerCompany(input, repo);
    expect(user.role).toBe("COMPANY");
    expect(repo.createCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "COMPANY",
        name: "Mercado do Vale",
        email: null,
        phone: "+5587999999999",
        profile: expect.objectContaining({
          fantasyName: "Mercado do Vale",
          documentType: null,
          legalDocumentLastDigits: null,
          city: null,
        }),
      }),
    );
    const payload = vi.mocked(repo.createCompany).mock.calls[0][0];
    expect(payload.passwordHash).not.toBe("segredo8");
  });

  it("rejeita senha de empresa com menos de 8 caracteres", async () => {
    await expect(
      registerCompany(
        {
          fantasyName: "Mercado do Vale",
          phone: "87999999999",
          password: "curta7",
        },
        repository(),
      ),
    ).rejects.toThrow(/8 caracteres/);
  });

  it("rejeita mass assignment de role e campos de outro perfil", async () => {
    await expect(
      registerCompany(
        {
          fantasyName: "Mercado do Vale",
          phone: "87999999999",
          password: "SenhaForte123",
          role: "ADMIN",
        },
        repository(),
      ),
    ).rejects.toThrow(/Unrecognized key/);
  });
});
