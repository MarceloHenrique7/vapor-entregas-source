import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  getPrisma: () => ({
    notification: {
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
    },
    $transaction: mocks.transaction,
  }),
}));

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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
});
