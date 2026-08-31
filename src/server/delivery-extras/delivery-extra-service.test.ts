import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import type { DeliveryExtraView } from "@/server/deliveries/types";

import {
  addDeliveryExtra,
  respondToDeliveryExtra,
  type DeliveryExtraRepository,
} from "./delivery-extra-service";
import {
  DeliveryExtraAccessDeniedError,
  DeliveryExtraConflictError,
} from "./errors";

const deliveryId = "11111111-1111-4111-8111-111111111111";
const extraId = "22222222-2222-4222-8222-222222222222";
const company = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "COMPANY" as const,
};
const now = new Date("2026-08-28T12:00:00Z");
const extra: DeliveryExtraView = {
  id: extraId,
  type: "WAITING",
  description: "Espera prevista de vinte minutos",
  amount: 5,
  informedByRole: "COMPANY",
  status: "PENDING",
  note: null,
  createdAt: now.toISOString(),
  history: [],
};

function repository(
  overrides: Partial<DeliveryExtraRepository> = {},
): DeliveryExtraRepository {
  return {
    addExtra: vi.fn().mockResolvedValue({ kind: "updated", extra }),
    respondToExtra: vi.fn().mockResolvedValue({
      kind: "updated",
      extra: { ...extra, status: "ACKNOWLEDGED" },
    }),
    ...overrides,
  };
}

describe("ETAPA 13 — adicionais operacionais", () => {
  it("exige autenticação e role operacional", async () => {
    const repo = repository();
    await expect(
      addDeliveryExtra(null, deliveryId, {}, repo, now),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      addDeliveryExtra(
        { ...company, role: "ADMIN" },
        deliveryId,
        {},
        repo,
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("normaliza e persiste condição informada pelo usuário da sessão", async () => {
    const repo = repository();
    await addDeliveryExtra(
      company,
      deliveryId,
      { type: "WAITING", description: "  Espera prevista  ", amount: "5.50" },
      repo,
      now,
    );
    expect(repo.addExtra).toHaveBeenCalledWith(
      company.userId,
      "COMPANY",
      deliveryId,
      { type: "WAITING", description: "Espera prevista", amount: 5.5 },
      now,
    );
  });

  it("rejeita valor negativo, HTML e IDs inválidos", async () => {
    const repo = repository();
    await expect(
      addDeliveryExtra(
        company,
        deliveryId,
        { type: "RETURN", description: "Retorno", amount: -1 },
        repo,
        now,
      ),
    ).rejects.toThrow();
    await expect(
      addDeliveryExtra(
        company,
        deliveryId,
        { type: "OTHER", description: "<script>teste</script>" },
        repo,
        now,
      ),
    ).rejects.toThrow();
    await expect(
      addDeliveryExtra(
        company,
        "id-forjado",
        { type: "RETURN", description: "Retorno" },
        repo,
        now,
      ),
    ).rejects.toThrow();
    expect(repo.addExtra).not.toHaveBeenCalled();
  });

  it("permite que a contraparte confirme explicitamente", async () => {
    const repo = repository();
    const motoboy = {
      userId: "44444444-4444-4444-8444-444444444444",
      role: "MOTOBOY" as const,
    };
    await respondToDeliveryExtra(
      motoboy,
      deliveryId,
      extraId,
      { decision: "ACKNOWLEDGED" },
      repo,
      now,
    );
    expect(repo.respondToExtra).toHaveBeenCalledWith(
      motoboy.userId,
      "MOTOBOY",
      deliveryId,
      extraId,
      { decision: "ACKNOWLEDGED" },
      now,
    );
  });

  it("bloqueia participante sem autorização", async () => {
    await expect(
      addDeliveryExtra(
        company,
        deliveryId,
        { type: "RETURN", description: "Retorno" },
        repository({
          addExtra: vi.fn().mockResolvedValue({ kind: "forbidden" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryExtraAccessDeniedError);
  });

  it("rejeita resposta duplicada ou condição fora da fase operacional", async () => {
    await expect(
      respondToDeliveryExtra(
        company,
        deliveryId,
        extraId,
        { decision: "REJECTED" },
        repository({
          respondToExtra: vi.fn().mockResolvedValue({ kind: "conflict" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryExtraConflictError);
  });
});
