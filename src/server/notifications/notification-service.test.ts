import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  createMany: vi.fn(),
  deliveryFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/config/env", () => ({
  getPresenceEnv: () => ({ ONLINE_PRESENCE_TTL_MINUTES: 5 }),
}));
vi.mock("@/server/db/prisma", () => ({
  getPrisma: () => ({
    notification: {
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
      createMany: mocks.createMany,
    },
    delivery: { findUnique: mocks.deliveryFindUnique },
    user: { findMany: mocks.userFindMany },
    $transaction: mocks.transaction,
  }),
}));

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyDeliveryEvent,
  notifyNewOpportunity,
} from "./notification-service";

const userId = "b87bc42d-771c-4e5e-ac49-ab40a4d9a651";

describe("central de notificações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it("lista somente notificações do usuário com paginação e contagem", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "8ad771f0-d4e5-46a2-a724-6447e431c755",
        type: "DELIVERY_ACCEPTED",
        title: "Corrida aceita",
        message: "Atualização",
        readAt: null,
        metadata: { deliveryId: "id" },
        createdAt: new Date("2026-08-27T20:00:00Z"),
      },
    ]);
    mocks.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const result = await listNotifications(userId, { page: 1, pageSize: 20 });
    expect(result.unread).toBe(1);
    expect(result.items[0].createdAt).toBe("2026-08-27T20:00:00.000Z");
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId }, take: 20, skip: 0 }),
    );
  });

  it("impede IDOR ao marcar notificação de outro usuário", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.count.mockResolvedValue(0);
    const result = await markNotificationRead(
      userId,
      "8ad771f0-d4e5-46a2-a724-6447e431c755",
    );
    expect(result).toBeNull();
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
      }),
    );
  });

  it("marca todas como lidas sem aceitar userId do frontend", async () => {
    mocks.updateMany.mockResolvedValue({ count: 3 });
    await expect(markAllNotificationsRead(userId)).resolves.toEqual({
      updated: 3,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, readAt: null } }),
    );
  });

  it("rejeita paginação excessiva", async () => {
    await expect(
      listNotifications(userId, { page: 1, pageSize: 500 }),
    ).rejects.toThrow();
  });

  it("usa uma chave persistente e skipDuplicates em reenvios do mesmo evento", async () => {
    mocks.deliveryFindUnique.mockResolvedValue({ pickupCity: "PETROLINA_PE" });
    mocks.userFindMany.mockResolvedValue([{ id: userId }]);
    mocks.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await notifyNewOpportunity("delivery-1");
    await notifyNewOpportunity("delivery-1");

    expect(mocks.createMany).toHaveBeenCalledTimes(2);
    expect(mocks.createMany).toHaveBeenLastCalledWith({
      data: [
        expect.objectContaining({
          userId,
          eventKey: "opportunity-created:delivery-1",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("notifica a empresa quando uma entrega é aceita e aponta para os detalhes", async () => {
    mocks.deliveryFindUnique.mockResolvedValue({
      company: { userId },
      motoboy: {
        userId: "a87bc42d-771c-4e5e-ac49-ab40a4d9a652",
      },
      status: "ACCEPTED",
    });
    mocks.createMany.mockResolvedValue({ count: 1 });

    await notifyDeliveryEvent("delivery-accepted", "accepted");

    expect(mocks.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        expect.objectContaining({
          userId,
          type: "DELIVERY_ACCEPTED",
          eventKey: "delivery:delivery-accepted:accepted:ACCEPTED",
          metadata: {
            deliveryId: "delivery-accepted",
            targetUrl: "/app/empresa/entregas/delivery-accepted",
          },
        }),
      ],
      skipDuplicates: true,
    });
  });
});
