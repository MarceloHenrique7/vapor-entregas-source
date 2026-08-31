import { describe, expect, it, vi } from "vitest";

import type { AdminActor } from "@/server/admin/types";

import {
  PRE_REGISTRATION_NOTICE_VERSION,
  createPreRegistration,
  exportPreRegistrationsCsv,
  getPreRegistrationAdminOverview,
  listPreRegistrationsForAdmin,
} from "./pre-registration-service";
import { normalizeBrazilianPhone } from "./schemas";
import type { PreRegistrationRecord, PreRegistrationRepository } from "./types";

const now = new Date("2026-08-28T18:30:00.000Z");
const baseRecord: PreRegistrationRecord = {
  id: "17000000-0000-4000-8000-000000000001",
  name: "Maria da Silva",
  phone: "(87) 99999-1234",
  normalizedPhone: "+5587999991234",
  type: "MOTOBOY",
  consentNoticeVersion: PRE_REGISTRATION_NOTICE_VERSION,
  consentRecordedAt: now,
  createdAt: now,
};

function repository(
  overrides: Partial<PreRegistrationRepository> = {},
): PreRegistrationRepository {
  return {
    createOrFind: vi.fn().mockResolvedValue({
      record: baseRecord,
      created: true,
    }),
    metrics: vi.fn().mockResolvedValue({
      total: 3,
      motoboys: 2,
      companies: 1,
    }),
    list: vi.fn().mockResolvedValue({ items: [baseRecord], total: 1 }),
    exportRows: vi.fn().mockResolvedValue([baseRecord]),
    ...overrides,
  };
}

const admin: AdminActor = {
  userId: "17000000-0000-4000-8000-000000000010",
  role: "ADMIN",
  status: "ACTIVE",
};

describe("pré-cadastro", () => {
  it("normaliza telefone brasileiro com ou sem código do país", () => {
    expect(normalizeBrazilianPhone("(87) 99999-1234")).toBe("+5587999991234");
    expect(normalizeBrazilianPhone("55 87 99999-1234")).toBe("+5587999991234");
    expect(normalizeBrazilianPhone("123")).toBeNull();
  });

  it.each(["MOTOBOY", "COMPANY"] as const)(
    "cria interesse %s com consentimento e horário do servidor",
    async (type) => {
      const repo = repository();
      await expect(
        createPreRegistration(
          { name: "  Maria   da Silva ", phone: "(87) 99999-1234", type },
          repo,
          now,
        ),
      ).resolves.toEqual({ created: true });
      expect(repo.createOrFind).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Maria da Silva",
          normalizedPhone: "+5587999991234",
          type,
          consentNoticeVersion: PRE_REGISTRATION_NOTICE_VERSION,
          now,
        }),
      );
    },
  );

  it("trata telefone e tipo iguais como cadastro existente", async () => {
    const repo = repository({
      createOrFind: vi.fn().mockResolvedValue({
        record: baseRecord,
        created: false,
      }),
    });
    await expect(
      createPreRegistration(
        {
          name: "Maria da Silva",
          phone: "+55 87 99999-1234",
          type: "MOTOBOY",
        },
        repo,
        now,
      ),
    ).resolves.toEqual({ created: false });
  });

  it.each([
    { name: "A", phone: "(87) 99999-1234", type: "MOTOBOY" },
    { name: "Nome", phone: "123", type: "MOTOBOY" },
    { name: "Nome", phone: "(87) 99999-1234", type: "ADMIN" },
    {
      name: "Nome",
      phone: "(87) 99999-1234",
      type: "MOTOBOY",
      unexpected: true,
    },
  ])("rejeita payload inválido %#", async (payload) => {
    await expect(
      createPreRegistration(payload, repository(), now),
    ).rejects.toBeDefined();
  });
});

describe("administração de pré-cadastros", () => {
  it("lista métricas e resultados apenas para ADMIN ativo", async () => {
    const repo = repository();
    await expect(getPreRegistrationAdminOverview(admin, repo)).resolves.toEqual(
      { total: 3, motoboys: 2, companies: 1 },
    );
    await expect(
      listPreRegistrationsForAdmin(
        admin,
        { page: 1, pageSize: 20, query: "Maria" },
        repo,
      ),
    ).resolves.toMatchObject({ total: 1, totalPages: 1 });
    await expect(
      getPreRegistrationAdminOverview({ ...admin, role: "COMPANY" }, repo),
    ).rejects.toThrow();
  });

  it("protege fórmulas em CSV e mantém os dados somente na exportação admin", async () => {
    const repo = repository({
      exportRows: vi
        .fn()
        .mockResolvedValue([{ ...baseRecord, name: "=IMPORTXML()" }]),
    });
    const csv = await exportPreRegistrationsCsv(admin, {}, repo);
    expect(csv).toContain("'=IMPORTXML()");
    expect(csv).toContain("WhatsApp");
  });
});
