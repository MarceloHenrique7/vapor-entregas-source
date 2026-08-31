import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  targetStatus: "ACTIVE" as "ACTIVE" | "SUSPENDED" | "BLOCKED",
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  sessionUpdateMany: vi.fn(),
  motoboyUpdate: vi.fn(),
  actionCreate: vi.fn(),
  deliveryFindMany: vi.fn(),
  deliveryCount: vi.fn(),
  deliveryFindUnique: vi.fn(),
  usersFindMany: vi.fn(),
  reportFindUnique: vi.fn(),
  reportUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/config/env", () => ({
  getPresenceEnv: () => ({ ONLINE_PRESENCE_TTL_MINUTES: 10 }),
  getSensitiveDataEnv: () => ({
    FIELD_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
  }),
}));
vi.mock("@/server/db/prisma", () => ({
  getPrisma: () => ({
    $transaction: async (callback: (transaction: unknown) => unknown) =>
      callback({
        user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
        session: { updateMany: mocks.sessionUpdateMany },
        motoboyProfile: { update: mocks.motoboyUpdate },
        adminAction: { create: mocks.actionCreate },
        report: {
          findUnique: mocks.reportFindUnique,
          update: mocks.reportUpdate,
        },
      }),
    delivery: {
      findMany: mocks.deliveryFindMany,
      count: mocks.deliveryCount,
      findUnique: mocks.deliveryFindUnique,
    },
    user: { findMany: mocks.usersFindMany },
  }),
}));

import {
  changeAdminReportStatus,
  changeAdminUserStatus,
  getAdminDelivery,
  listAdminDeliveries,
} from "./admin-service";
import { AdminActionConflictError, AdminResourceNotFoundError } from "./errors";

const admin = {
  userId: "3bc85ce1-9cdb-40a7-a435-2c9b5ad32d10",
  role: "ADMIN",
  status: "ACTIVE",
} as const;
const targetId = "9e04f285-c07d-41e5-92e9-152cc885f24a";

describe("serviço administrativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.targetStatus = "ACTIVE";
    mocks.userFindUnique.mockImplementation(async () => ({
      role: "MOTOBOY",
      status: mocks.targetStatus,
      motoboyProfile: { id: "d9346d35-a196-4e31-83cc-7ed642074cef" },
    }));
    mocks.userUpdate.mockImplementation(
      async ({ data }: { data: { status: typeof mocks.targetStatus } }) => {
        mocks.targetStatus = data.status;
      },
    );
    mocks.actionCreate.mockResolvedValue({
      id: "084a851f-8628-4ccb-aaf7-86db828bfb2c",
    });
    mocks.sessionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.motoboyUpdate.mockResolvedValue({});
  });

  it("suspende usuário, revoga sessões, encerra presença e gera auditoria", async () => {
    const result = await changeAdminUserStatus(admin, targetId, {
      status: "SUSPENDED",
      reason: "Análise manual de segurança",
    });
    expect(result.status).toBe("SUSPENDED");
    expect(mocks.sessionUpdateMany).toHaveBeenCalledOnce();
    expect(mocks.motoboyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isOnline: false }),
      }),
    );
    expect(mocks.actionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: "USER_SUSPENDED",
          targetUserId: targetId,
        }),
      }),
    );
  });

  it("reativa e bane preservando o mesmo usuário e registrando cada ação", async () => {
    mocks.targetStatus = "SUSPENDED";
    await changeAdminUserStatus(admin, targetId, { status: "ACTIVE" });
    expect(mocks.actionCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: "USER_REACTIVATED" }),
      }),
    );
    await changeAdminUserStatus(admin, targetId, {
      status: "BLOCKED",
      reason: "Fraude confirmada após análise manual",
    });
    expect(mocks.actionCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: "USER_BANNED" }),
      }),
    );
  });

  it("rejeita alteração duplicada e usuário inexistente", async () => {
    mocks.targetStatus = "SUSPENDED";
    await expect(
      changeAdminUserStatus(admin, targetId, {
        status: "SUSPENDED",
        reason: "Análise manual de segurança",
      }),
    ).rejects.toBeInstanceOf(AdminActionConflictError);
    mocks.userFindUnique.mockResolvedValueOnce(null);
    await expect(
      changeAdminUserStatus(admin, targetId, {
        status: "BLOCKED",
        reason: "Análise manual de segurança",
      }),
    ).rejects.toBeInstanceOf(AdminResourceNotFoundError);
  });

  it("aplica filtros e paginação server-side na listagem de entregas", async () => {
    mocks.deliveryFindMany.mockResolvedValue([]);
    mocks.deliveryCount.mockResolvedValue(41);
    const result = await listAdminDeliveries(admin, {
      status: "COMPLETED",
      company: "Loja",
      page: 2,
      pageSize: 20,
    });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(mocks.deliveryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });

  it("consulta timeline, avaliações e denúncias sem retornar coordenadas", async () => {
    mocks.deliveryFindUnique.mockResolvedValue({
      id: targetId,
      company: { fantasyName: "Mercado Vale" },
      motoboy: { user: { name: "João" } },
      pickupAddress: "Rua A",
      pickupNumber: "10",
      pickupNeighborhood: "Centro",
      destinationAddress: "Rua B",
      destinationNumber: "20",
      destinationNeighborhood: "José e Maria",
      pickupCity: "PETROLINA_PE",
      status: "COMPLETED",
      offeredPrice: 25,
      createdAt: new Date("2026-08-27T10:00:00Z"),
      completedAt: new Date("2026-08-27T11:00:00Z"),
      paymentMethod: "PIX",
      notes: null,
      statusHistory: [
        {
          id: "h1",
          previousStatus: "IN_DELIVERY",
          newStatus: "COMPLETED",
          actorUserId: targetId,
          actorRole: "MOTOBOY",
          note: null,
          createdAt: new Date("2026-08-27T11:00:00Z"),
        },
      ],
      ratings: [],
      reports: [],
      pickupLatitude: -9.4,
      destinationLongitude: -40.5,
    });
    mocks.usersFindMany.mockResolvedValue([{ id: targetId, name: "João" }]);
    const result = await getAdminDelivery(admin, targetId);
    expect(result.history[0].actorName).toBe("João");
    expect(result).not.toHaveProperty("pickupLatitude");
    expect(result).not.toHaveProperty("destinationLongitude");
  });

  it("modera e reabre denúncia somente com transições válidas e log", async () => {
    mocks.reportFindUnique.mockResolvedValue({
      status: "OPEN",
      reportedUserId: targetId,
    });
    mocks.reportUpdate.mockResolvedValue({});
    await changeAdminReportStatus(admin, targetId, {
      status: "UNDER_REVIEW",
      reason: "Início da análise",
    });
    expect(mocks.actionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: "REPORT_STATUS_CHANGED" }),
      }),
    );
    mocks.reportFindUnique.mockResolvedValue({
      status: "RESOLVED",
      reportedUserId: targetId,
    });
    await changeAdminReportStatus(admin, targetId, {
      status: "UNDER_REVIEW",
      reason: "Novas evidências recebidas",
    });
    mocks.reportFindUnique.mockResolvedValue({
      status: "OPEN",
      reportedUserId: targetId,
    });
    await expect(
      changeAdminReportStatus(admin, targetId, {
        status: "RESOLVED",
        reason: "Salto inválido",
      }),
    ).rejects.toBeInstanceOf(AdminActionConflictError);
  });
});
