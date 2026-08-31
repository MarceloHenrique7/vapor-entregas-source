import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getMotoboyPresence: vi.fn(),
  setMotoboyOnline: vi.fn(),
  assertOperationalSubscription: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/config/env", () => ({
  getPresenceEnv: () => ({
    ONLINE_PRESENCE_TTL_MINUTES: 10,
    PRESENCE_LOCATION_MIN_INTERVAL_SECONDS: 30,
  }),
}));
vi.mock("@/server/presence/presence-service", () => ({
  getMotoboyPresence: mocks.getMotoboyPresence,
  setMotoboyOnline: mocks.setMotoboyOnline,
}));
vi.mock("@/server/presence/prisma-presence-repository", () => ({
  prismaPresenceRepository: {},
}));
vi.mock("@/server/subscriptions/prisma-subscription-repository", () => ({
  prismaSubscriptionRepository: {},
}));
vi.mock("@/server/subscriptions/subscription-service", () => ({
  assertOperationalSubscription: mocks.assertOperationalSubscription,
}));

import { GET } from "./route";
import { POST as POST_ONLINE } from "./online/route";

const presence = {
  isOnline: true,
  onlineSince: "2026-08-27T15:00:00.000Z",
  lastLocationAt: "2026-08-27T15:00:00.000Z",
  expiresAt: "2026-08-27T15:10:00.000Z",
};

describe("rotas de presença do motoboy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertOperationalSubscription.mockResolvedValue(undefined);
  });

  it("permite que motoboy autenticado use o endpoint online", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "6df395ce-76c5-4918-af39-ef6f07f189aa",
      role: "MOTOBOY",
    });
    mocks.setMotoboyOnline.mockResolvedValue(presence);
    const request = new NextRequest(
      "http://localhost:3000/api/motoboy/presence/online",
      {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ latitude: -9.3891, longitude: -40.5031 }),
      },
    );
    const response = await POST_ONLINE(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ presence });
    expect(mocks.requireRole).toHaveBeenCalledWith(["MOTOBOY"]);
  });

  it("rejeita empresa no endpoint de presença", async () => {
    mocks.requireRole.mockRejectedValue(new ForbiddenError());
    const request = new NextRequest(
      "http://localhost:3000/api/motoboy/presence/online",
      {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ latitude: -9.3891, longitude: -40.5031 }),
      },
    );
    const response = await POST_ONLINE(request);
    expect(response.status).toBe(403);
  });

  it("rejeita usuário não autenticado no endpoint de consulta", async () => {
    mocks.requireRole.mockRejectedValue(new UnauthenticatedError());
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "SESSION_INVALID" });
  });
});
