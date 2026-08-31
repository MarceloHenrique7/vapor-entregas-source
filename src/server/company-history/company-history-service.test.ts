import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";

import {
  getCompanyHistoryDetail,
  getCompanyMotoboyRelationship,
  getCompanyRepeatDraft,
  listCompanyHistory,
  listCompanyMotoboys,
  type CompanyHistoryRepository,
} from "./company-history-service";

const company = {
  userId: "11111111-1111-4111-8111-111111111111",
  role: "COMPANY" as const,
};
const deliveryId = "22222222-2222-4222-8222-222222222222";
const motoboyId = "33333333-3333-4333-8333-333333333333";

function repository(): CompanyHistoryRepository {
  return {
    listHistory: vi
      .fn()
      .mockResolvedValue({ items: [], pagination: { page: 2 } }),
    getHistoryDetail: vi.fn().mockResolvedValue({ id: deliveryId }),
    getRepeatDraft: vi.fn().mockResolvedValue({ id: deliveryId }),
    listMotoboys: vi
      .fn()
      .mockResolvedValue({ items: [], pagination: { page: 1 } }),
    getMotoboyRelationship: vi
      .fn()
      .mockResolvedValue({ motoboy: { id: motoboyId } }),
  };
}

describe("ETAPA 12 — histórico e relacionamentos da empresa", () => {
  beforeAll(() => {
    expect(company.role).toBe("COMPANY");
  });

  it("exige autenticação e role COMPANY", async () => {
    const repo = repository();
    await expect(listCompanyHistory(null, {}, repo)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(
      listCompanyHistory({ ...company, role: "MOTOBOY" }, {}, repo),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("valida filtros e encaminha paginação server-side", async () => {
    const repo = repository();
    await listCompanyHistory(
      company,
      {
        page: "2",
        pageSize: "20",
        status: "COMPLETED",
        city: "PETROLINA_PE",
        query: "Centro",
      },
      repo,
    );
    expect(repo.listHistory).toHaveBeenCalledWith(
      company.userId,
      expect.objectContaining({
        page: 2,
        pageSize: 20,
        status: "COMPLETED",
        city: "PETROLINA_PE",
        query: "Centro",
      }),
    );
  });

  it("rejeita período e tamanho de página inválidos", async () => {
    const repo = repository();
    await expect(
      listCompanyHistory(
        company,
        { from: "2026-08-20", to: "2026-08-01" },
        repo,
      ),
    ).rejects.toThrow();
    await expect(
      listCompanyHistory(company, { pageSize: 500 }, repo),
    ).rejects.toThrow();
  });

  it("consulta detalhe sempre no escopo do usuário autenticado", async () => {
    const repo = repository();
    await getCompanyHistoryDetail(company, deliveryId, repo);
    expect(repo.getHistoryDetail).toHaveBeenCalledWith(
      company.userId,
      deliveryId,
    );
  });

  it("cria apenas um rascunho protegido, sem publicar entrega", async () => {
    const repo = repository();
    const draft = await getCompanyRepeatDraft(company, deliveryId, repo);
    expect(repo.getRepeatDraft).toHaveBeenCalledWith(
      company.userId,
      deliveryId,
    );
    expect(draft).toEqual({ id: deliveryId });
    expect(repo.listHistory).not.toHaveBeenCalled();
  });

  it("lista somente relacionamentos no escopo da empresa", async () => {
    const repo = repository();
    await getCompanyMotoboyRelationship(company, motoboyId, { page: 1 }, repo);
    expect(repo.getMotoboyRelationship).toHaveBeenCalledWith(
      company.userId,
      motoboyId,
      expect.objectContaining({ page: 1, pageSize: 20 }),
    );
  });

  it("protege a lista de motoboys e normaliza favoritosOnly", async () => {
    const repo = repository();
    await listCompanyMotoboys(
      company,
      { favoritesOnly: "true" },
      repo,
      new Date("2026-08-27T12:00:00Z"),
      10,
    );
    expect(repo.listMotoboys).toHaveBeenCalledWith(
      company.userId,
      expect.objectContaining({ favoritesOnly: true }),
      expect.any(Date),
      10,
    );
    await expect(
      listCompanyMotoboys(
        { ...company, role: "ADMIN" },
        {},
        repo,
        new Date(),
        10,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejeita IDs arbitrários antes de acessar o repositório", async () => {
    const repo = repository();
    await expect(
      getCompanyHistoryDetail(company, "não-é-uuid", repo),
    ).rejects.toThrow();
    expect(repo.getHistoryDetail).not.toHaveBeenCalled();
  });
});
