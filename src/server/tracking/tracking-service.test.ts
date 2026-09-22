import { randomBytes, randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/server/auth/errors";

import {
  TrackingAccessDeniedError,
  TrackingExpiredError,
  TrackingNotFoundError,
  TrackingUnavailableError,
} from "./errors";
import {
  createOrGetTrackingLink,
  getPublicTracking,
  getTrackingLink,
  revokeTrackingLink,
  type TrackingRepository,
  type TrackingRuntimeConfig,
  updateDeliveryTrackingLocation,
} from "./tracking-service";
import { createTrackingToken, hashTrackingToken } from "./token";
import type { TrackingDeliveryRecord, TrackingRecord } from "./types";

const now = new Date("2026-09-17T18:00:00.000Z");
const companyUserId = randomUUID();
const motoboyUserId = randomUUID();
const deliveryId = randomUUID();
const config: TrackingRuntimeConfig = {
  appUrl: "https://vapor.example.test",
  encryptionKey: randomBytes(32).toString("base64"),
  linkTtlHours: 72,
  terminalTtlHours: 24,
  locationMinIntervalSeconds: 10,
  locationStaleSeconds: 60,
};

function record(overrides: Partial<TrackingRecord> = {}): TrackingRecord {
  return {
    id: randomUUID(),
    deliveryId,
    tokenHash: "a".repeat(64),
    tokenEncrypted: "encrypted-in-test",
    expiresAt: new Date(now.getTime() + 72 * 60 * 60_000),
    revokedAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastAccuracyMeters: null,
    lastLocationAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function delivery(
  overrides: Partial<TrackingDeliveryRecord> = {},
): TrackingDeliveryRecord {
  return {
    id: deliveryId,
    status: "ACCEPTED",
    companyName: "Mercado do Vale",
    companyUserId,
    motoboyUserId,
    destinationNeighborhood: "Centro",
    destinationCity: "PETROLINA_PE",
    destinationState: "PE",
    destinationLatitude: -9.39,
    destinationLongitude: -40.5,
    completedAt: null,
    cancelledAt: null,
    tracking: null,
    ...overrides,
  };
}

function repository(
  current: TrackingDeliveryRecord,
  overrides: Partial<TrackingRepository> = {},
): TrackingRepository {
  return {
    getDeliveryForActor: vi.fn(async (userId, role) => {
      const owns =
        role === "COMPANY"
          ? userId === current.companyUserId
          : userId === current.motoboyUserId;
      return owns ? current : "forbidden";
    }),
    saveLink: vi.fn(async (input) =>
      record({
        tokenHash: input.tokenHash,
        tokenEncrypted: input.tokenEncrypted,
        expiresAt: input.expiresAt,
      }),
    ),
    revokeLink: vi.fn().mockResolvedValue(true),
    updateLocation: vi.fn().mockResolvedValue(true),
    getByTokenHash: vi.fn().mockResolvedValue(current),
    ...overrides,
  };
}

describe("tracking seguro por entrega", () => {
  it("gera tokens fortes, não sequenciais e sem identificadores internos", () => {
    const first = createTrackingToken();
    const second = createTrackingToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain(deliveryId);
    expect(hashTrackingToken(first)).toHaveLength(64);
  });

  it("empresa dona gera e recupera o mesmo link ativo", async () => {
    const repo = repository(delivery());
    const created = await createOrGetTrackingLink(
      { userId: companyUserId, role: "COMPANY" },
      deliveryId,
      repo,
      now,
      config,
    );
    expect(created.url).toMatch(/^https:\/\/vapor\.example\.test\/r\//);
    expect(created.state).toBe("ACTIVE");
    expect(repo.saveLink).toHaveBeenCalledTimes(1);

    const encrypted = await vi.mocked(repo.saveLink).mock.results[0].value;
    const existing = delivery({ tracking: await encrypted });
    const existingRepo = repository(existing);
    const loaded = await getTrackingLink(
      { userId: companyUserId, role: "COMPANY" },
      deliveryId,
      existingRepo,
      now,
      config,
    );
    expect(loaded.url).toBe(created.url);
  });

  it("impede IDOR, motoboy gerar link e empresa atualizar GPS", async () => {
    const repo = repository(delivery());
    await expect(
      getTrackingLink(
        { userId: randomUUID(), role: "COMPANY" },
        deliveryId,
        repo,
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
    await expect(
      createOrGetTrackingLink(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        repo,
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
    await expect(
      updateDeliveryTrackingLocation(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        {},
        repo,
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
    await expect(
      getTrackingLink(
        { userId: randomUUID(), role: "ADMIN" },
        deliveryId,
        repo,
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("motoboy correto atualiza somente em IN_DELIVERY com coordenadas válidas", async () => {
    const rawToken = createTrackingToken();
    const activeTracking = record({
      tokenHash: hashTrackingToken(rawToken),
      tokenEncrypted: "not-used-for-motoboy",
    });
    const repo = repository(
      delivery({ status: "IN_DELIVERY", tracking: activeTracking }),
    );
    await expect(
      updateDeliveryTrackingLocation(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        {
          latitude: -9.3891,
          longitude: -40.5031,
          accuracyMeters: 8.5,
          capturedAt: now.toISOString(),
        },
        repo,
        now,
        config,
      ),
    ).resolves.toEqual({ updatedAt: now.toISOString() });
    expect(repo.updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        motoboyUserId,
        latitude: -9.3891,
        longitude: -40.5031,
      }),
    );
    await expect(
      updateDeliveryTrackingLocation(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        {
          latitude: 91,
          longitude: -40,
          accuracyMeters: 8,
          capturedAt: now.toISOString(),
        },
        repo,
        now,
        config,
      ),
    ).rejects.toThrow();
  });

  it("rejeita atualização antes da fase ao cliente e após conclusão", async () => {
    for (const status of ["PICKED_UP", "COMPLETED"] as const) {
      const repo = repository(delivery({ status, tracking: record() }));
      await expect(
        updateDeliveryTrackingLocation(
          { userId: motoboyUserId, role: "MOTOBOY" },
          deliveryId,
          {},
          repo,
          now,
          config,
        ),
      ).rejects.toBeInstanceOf(TrackingUnavailableError);
    }
  });

  it("API pública não expõe posição antes de IN_DELIVERY nem após término", async () => {
    const token = createTrackingToken();
    const tracking = record({
      tokenHash: hashTrackingToken(token),
      lastLatitude: -9.3891,
      lastLongitude: -40.5031,
      lastAccuracyMeters: 7,
      lastLocationAt: now,
    });
    for (const status of [
      "PICKED_UP",
      "COMPLETED",
      "CANCELLED_BY_COMPANY",
    ] as const) {
      const terminalAt = new Date(now.getTime() - 1_000);
      const current = delivery({
        status,
        tracking,
        completedAt: status === "COMPLETED" ? terminalAt : null,
        cancelledAt: status === "CANCELLED_BY_COMPANY" ? terminalAt : null,
      });
      const result = await getPublicTracking(
        token,
        repository(current),
        now,
        config,
      );
      expect(result.location).toBeNull();
      expect(result).not.toHaveProperty("deliveryId");
      expect(result).not.toHaveProperty("motoboyUserId");
    }
  });

  it("marca posição antiga como stale e mantém somente resposta mínima", async () => {
    const token = createTrackingToken();
    const current = delivery({
      status: "IN_DELIVERY",
      tracking: record({
        tokenHash: hashTrackingToken(token),
        lastLatitude: -9.3891,
        lastLongitude: -40.5031,
        lastAccuracyMeters: 12,
        lastLocationAt: new Date(now.getTime() - 61_000),
      }),
    });
    const result = await getPublicTracking(
      token,
      repository(current),
      now,
      config,
    );
    expect(result.state).toBe("STALE");
    expect(result.location).toMatchObject({ accuracyMeters: 12 });
    expect(JSON.stringify(result)).not.toContain("token");
  });

  it("token inexistente, revogado e expirado não liberam dados", async () => {
    const token = createTrackingToken();
    await expect(
      getPublicTracking(
        token,
        repository(delivery(), {
          getByTokenHash: vi.fn().mockResolvedValue(null),
        }),
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingNotFoundError);
    await expect(
      getPublicTracking(
        token,
        repository(delivery({ tracking: record({ revokedAt: now }) })),
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingNotFoundError);
    await expect(
      getPublicTracking(
        token,
        repository(
          delivery({
            tracking: record({ expiresAt: new Date(now.getTime() - 1) }),
          }),
        ),
        now,
        config,
      ),
    ).rejects.toBeInstanceOf(TrackingExpiredError);
  });

  it("empresa pode revogar sem conhecer o token bruto", async () => {
    const repo = repository(delivery({ tracking: record() }));
    await expect(
      revokeTrackingLink(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        repo,
        now,
      ),
    ).resolves.toEqual({ revoked: true });
    expect(repo.revokeLink).toHaveBeenCalledWith(deliveryId, now);
  });
});
