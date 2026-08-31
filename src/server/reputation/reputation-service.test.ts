import { describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/server/auth/errors";

import {
  DeliveryNotEligibleError,
  DuplicateFavoriteError,
  DuplicateRatingError,
  DuplicateReportError,
  FavoriteNotFoundError,
  ReputationAccessDeniedError,
} from "./errors";
import {
  addFavorite,
  createRating,
  createReport,
  getRatingOverview,
  normalizeRatingSummary,
  removeFavorite,
  type ReputationRepository,
} from "./reputation-service";
import type { DeliveryParticipants, FavoriteRecord } from "./types";

const companyUserId = "6b8c789a-3dd5-4306-9421-06be56bf8ab1";
const motoboyUserId = "8ecea68d-b6d8-45e1-93c7-bf49dd79999a";
const deliveryId = "6a3eecbd-7d75-41fd-8782-1e0182fe8cae";
const favoriteId = "8cf48295-a5c7-44c0-a09f-cdb8bad7e8df";
const now = new Date("2026-08-27T19:00:00.000Z");

const participants: DeliveryParticipants = {
  deliveryId,
  status: "COMPLETED",
  companyUserId,
  companyName: "Mercado do Vale",
  motoboyUserId,
  motoboyName: "João Entregador",
  companyProfileId: "3fbb8fad-c278-4487-a295-b7077f3352bf",
  motoboyProfileId: "a468c810-a5ef-4024-8fdc-c3954e517389",
};

const favorite: FavoriteRecord = {
  id: favoriteId,
  motoboyId: participants.motoboyProfileId!,
  motoboyUserId,
  name: participants.motoboyName!,
  ratingAverage: 4.75,
  ratingCount: 12,
  completedDeliveries: 18,
  isOnline: false,
  lastLocationAt: null,
  createdAt: now.toISOString(),
};

function repository(
  overrides: Partial<ReputationRepository> = {},
): ReputationRepository {
  return {
    getDeliveryParticipants: vi.fn().mockResolvedValue(participants),
    createRating: vi.fn().mockResolvedValue({
      kind: "created",
      rating: {
        id: "550d6eec-39cb-4ae9-9752-1126510a55f4",
        deliveryId,
        score: 5,
        comment: null,
        reviewedName: participants.motoboyName!,
        createdAt: now.toISOString(),
      },
    }),
    getRatingOverview: vi.fn().mockResolvedValue({
      received: { average: 4.75, count: 4 },
      given: [],
      pending: [],
      counterparties: {
        [deliveryId]: {
          name: participants.motoboyName!,
          average: 4.66,
          count: 3,
        },
      },
    }),
    createFavorite: vi.fn().mockResolvedValue({ kind: "created", favorite }),
    removeFavorite: vi.fn().mockResolvedValue(true),
    listFavorites: vi.fn().mockResolvedValue([favorite]),
    createReport: vi.fn().mockResolvedValue({
      kind: "created",
      report: {
        id: "63e95519-ff90-41fe-a8de-38d42425acfa",
        deliveryId,
        category: "OTHER",
        description: "Descrição detalhada do problema ocorrido.",
        status: "OPEN",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    }),
    listReports: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("avaliações", () => {
  it("permite que participante avalie uma corrida concluída", async () => {
    const repo = repository();
    await expect(
      createRating(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId, score: 5, comment: "Ótima entrega" },
        repo,
        now,
      ),
    ).resolves.toMatchObject({ score: 5 });
    expect(repo.createRating).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerUserId: companyUserId,
        reviewedUserId: motoboyUserId,
        reviewerRole: "COMPANY",
      }),
    );
  });

  it("impede avaliação antes da conclusão", async () => {
    await expect(
      createRating(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId, score: 4 },
        repository({
          getDeliveryParticipants: vi
            .fn()
            .mockResolvedValue({ ...participants, status: "IN_DELIVERY" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryNotEligibleError);
  });

  it("impede avaliação duplicada e usuário não participante", async () => {
    await expect(
      createRating(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId, score: 4 },
        repository({
          createRating: vi.fn().mockResolvedValue({ kind: "duplicate" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DuplicateRatingError);
    await expect(
      createRating(
        {
          userId: "d9098b9c-1fca-444e-b503-1d7645375163",
          role: "MOTOBOY",
        },
        { deliveryId, score: 4 },
        repository(),
        now,
      ),
    ).rejects.toBeInstanceOf(ReputationAccessDeniedError);
  });

  it("calcula e apresenta médias com uma casa decimal", async () => {
    expect(normalizeRatingSummary({ average: 14 / 3, count: 3 })).toEqual({
      average: 4.7,
      count: 3,
    });
    const overview = await getRatingOverview(
      { userId: companyUserId, role: "COMPANY" },
      repository(),
    );
    expect(overview.received.average).toBe(4.8);
    expect(overview.counterparties[deliveryId].average).toBe(4.7);
  });
});

describe("favoritos", () => {
  it("favorita e desfavorita com ownership da empresa", async () => {
    await expect(
      addFavorite(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId },
        repository(),
        now,
      ),
    ).resolves.toMatchObject({ motoboyId: participants.motoboyProfileId });
    await expect(
      removeFavorite(
        { userId: companyUserId, role: "COMPANY" },
        favoriteId,
        repository(),
      ),
    ).resolves.toBeUndefined();
  });

  it("impede favorito duplicado e remoção alheia", async () => {
    await expect(
      addFavorite(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId },
        repository({
          createFavorite: vi.fn().mockResolvedValue({ kind: "duplicate" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DuplicateFavoriteError);
    await expect(
      removeFavorite(
        { userId: companyUserId, role: "COMPANY" },
        favoriteId,
        repository({ removeFavorite: vi.fn().mockResolvedValue(false) }),
      ),
    ).rejects.toBeInstanceOf(FavoriteNotFoundError);
  });
});

describe("denúncias e roles", () => {
  it("cria denúncia vinculada somente contra a contraparte", async () => {
    const repo = repository();
    await expect(
      createReport(
        { userId: motoboyUserId, role: "MOTOBOY" },
        {
          deliveryId,
          category: "OTHER",
          description: "Descrição detalhada do problema ocorrido.",
        },
        repo,
        now,
      ),
    ).resolves.toMatchObject({ status: "OPEN" });
    expect(repo.createReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterUserId: motoboyUserId,
        reportedUserId: companyUserId,
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("impede denúncia inválida, duplicada e alteração de status pelo payload", async () => {
    await expect(
      createReport(
        { userId: companyUserId, role: "COMPANY" },
        { deliveryId, category: "OTHER", description: "curta" },
        repository(),
        now,
      ),
    ).rejects.toThrow();
    await expect(
      createReport(
        { userId: companyUserId, role: "COMPANY" },
        {
          deliveryId,
          category: "OTHER",
          description: "Descrição detalhada do problema ocorrido.",
          status: "RESOLVED",
        },
        repository(),
        now,
      ),
    ).rejects.toThrow();
    await expect(
      createReport(
        { userId: companyUserId, role: "COMPANY" },
        {
          deliveryId,
          category: "OTHER",
          description: "Descrição detalhada do problema ocorrido.",
        },
        repository({
          createReport: vi.fn().mockResolvedValue({ kind: "duplicate" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DuplicateReportError);
    await expect(
      createReport(
        {
          userId: "d9098b9c-1fca-444e-b503-1d7645375163",
          role: "MOTOBOY",
        },
        {
          deliveryId,
          category: "OTHER",
          description: "Descrição detalhada do problema ocorrido.",
        },
        repository(),
        now,
      ),
    ).rejects.toBeInstanceOf(ReputationAccessDeniedError);
  });

  it("protege operações por role", async () => {
    await expect(
      addFavorite(
        { userId: motoboyUserId, role: "MOTOBOY" },
        { deliveryId },
        repository(),
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      createRating(
        { userId: companyUserId, role: "ADMIN" },
        { deliveryId, score: 5 },
        repository(),
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
