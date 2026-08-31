import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  companyFindUnique: vi.fn(),
  motoboyCount: vi.fn(),
  motoboyFindMany: vi.fn(),
  deliveryGroupBy: vi.fn(),
  ratingGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  getPrisma: () => ({
    companyProfile: { findUnique: mocks.companyFindUnique },
    motoboyProfile: {
      count: mocks.motoboyCount,
      findMany: mocks.motoboyFindMany,
    },
    delivery: { groupBy: mocks.deliveryGroupBy },
    rating: { groupBy: mocks.ratingGroupBy },
  }),
}));

import { prismaCompanyHistoryRepository } from "./prisma-company-history-repository";

describe("privacidade da placa do motoboy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.companyFindUnique.mockResolvedValue({ id: "company-profile-id" });
    mocks.motoboyCount.mockResolvedValue(1);
    mocks.motoboyFindMany.mockResolvedValue([
      {
        id: "motoboy-profile-id",
        userId: "motoboy-user-id",
        vehiclePlate: "ABC1D23",
        isOnline: false,
        lastLocationAt: null,
        user: { name: "Maria Silva" },
        favoritedBy: [],
        deliveries: [],
      },
    ]);
    mocks.deliveryGroupBy.mockResolvedValue([]);
    mocks.ratingGroupBy.mockResolvedValue([]);
  });

  it("não seleciona nem serializa vehiclePlate para empresas", async () => {
    const result = await prismaCompanyHistoryRepository.listMotoboys(
      "company-user-id",
      { page: 1, pageSize: 20, favoritesOnly: false },
      new Date("2026-08-30T12:00:00Z"),
      10,
    );

    const query = mocks.motoboyFindMany.mock.calls[0][0];
    expect(query.select).not.toHaveProperty("vehiclePlate");
    expect(JSON.stringify(result)).not.toContain("vehiclePlate");
    expect(JSON.stringify(result)).not.toContain("ABC1D23");
  });
});
