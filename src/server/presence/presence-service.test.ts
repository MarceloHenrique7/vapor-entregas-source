import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";

import { MotoboyOfflineError, PresenceRateLimitError } from "./errors";
import { endPresenceOnLogout } from "./logout-presence";
import {
  calculateDistanceKm,
  getMotoboyPresence,
  type PresenceRepository,
  setMotoboyOffline,
  setMotoboyOnline,
  updateMotoboyLocation,
} from "./presence-service";
import type { MotoboyPresenceRecord } from "./types";

const userId = "6df395ce-76c5-4918-af39-ef6f07f189aa";
const now = new Date("2026-08-27T15:00:00.000Z");
const coordinates = { latitude: -9.3891, longitude: -40.5031 };

function createRepository(initialOnline = false): PresenceRepository & {
  current: MotoboyPresenceRecord;
} {
  const repository: PresenceRepository & {
    current: MotoboyPresenceRecord;
  } = {
    current: {
      motoboyId: "63cbdfea-cc80-4abd-9557-0bd87284fcef",
      userId,
      isOnline: initialOnline,
      onlineSince: initialOnline ? new Date(now.getTime() - 60_000) : null,
      lastLocationAt: initialOnline ? new Date(now.getTime() - 60_000) : null,
      lastLatitude: initialOnline ? coordinates.latitude : null,
      lastLongitude: initialOnline ? coordinates.longitude : null,
    },
    getByUserId: vi.fn(async (requestedUserId: string) =>
      requestedUserId === userId ? { ...repository.current } : null,
    ),
    setOnline: vi.fn(async (requestedUserId, nextCoordinates, occurredAt) => {
      if (requestedUserId !== userId) return null;
      repository.current = {
        ...repository.current,
        isOnline: true,
        onlineSince: occurredAt,
        lastLocationAt: occurredAt,
        lastLatitude: nextCoordinates.latitude,
        lastLongitude: nextCoordinates.longitude,
      };
      return { ...repository.current };
    }),
    updateLocationWhileOnline: vi.fn(
      async (requestedUserId, nextCoordinates, occurredAt, oldestAllowed) => {
        if (
          requestedUserId !== userId ||
          !repository.current.isOnline ||
          (repository.current.lastLocationAt &&
            repository.current.lastLocationAt > oldestAllowed)
        ) {
          return null;
        }
        repository.current = {
          ...repository.current,
          lastLocationAt: occurredAt,
          lastLatitude: nextCoordinates.latitude,
          lastLongitude: nextCoordinates.longitude,
        };
        return { ...repository.current };
      },
    ),
    setOffline: vi.fn(async (requestedUserId) => {
      if (requestedUserId !== userId) return null;
      repository.current = {
        ...repository.current,
        isOnline: false,
        onlineSince: null,
      };
      return { ...repository.current };
    }),
  };
  return repository;
}

const actor = { userId, role: "MOTOBOY" as const };

describe("presença do motoboy", () => {
  it("permite que motoboy autenticado fique online sem expor coordenadas", async () => {
    const repository = createRepository();
    const result = await setMotoboyOnline(
      actor,
      { ...coordinates, userId: "8bf11b89-066d-431b-b2ee-99c008ebcbbb" },
      repository,
      now,
      10,
    );
    expect(result.isOnline).toBe(true);
    expect(result.onlineSince).toBe(now.toISOString());
    expect(result).not.toHaveProperty("lastLatitude");
    expect(result).not.toHaveProperty("lastLongitude");
    expect(repository.setOnline).toHaveBeenCalledWith(userId, coordinates, now);
  });

  it("rejeita empresa no módulo de presença do motoboy", async () => {
    await expect(
      setMotoboyOnline(
        { userId, role: "COMPANY" },
        coordinates,
        createRepository(),
        now,
        10,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejeita usuário não autenticado", async () => {
    await expect(
      getMotoboyPresence(null, createRepository(), now, 10),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it.each([
    { latitude: 90.1, longitude: -40.5 },
    { latitude: -9.3, longitude: -180.1 },
    { latitude: Number.POSITIVE_INFINITY, longitude: -40.5 },
  ])("rejeita coordenadas inválidas: %o", async (invalidCoordinates) => {
    await expect(
      setMotoboyOnline(actor, invalidCoordinates, createRepository(), now, 10),
    ).rejects.toThrow();
  });

  it("atualiza somente a última localização enquanto online", async () => {
    const repository = createRepository(true);
    const later = new Date(now.getTime() + 60_000);
    const nextCoordinates = { latitude: -9.387, longitude: -40.501 };
    const result = await updateMotoboyLocation(
      actor,
      nextCoordinates,
      repository,
      later,
      10,
      30,
    );
    expect(result.lastLocationAt).toBe(later.toISOString());
    expect(repository.current.lastLatitude).toBe(nextCoordinates.latitude);
    expect(repository.current.lastLongitude).toBe(nextCoordinates.longitude);
  });

  it("não permite atualizar localização enquanto offline", async () => {
    await expect(
      updateMotoboyLocation(
        actor,
        coordinates,
        createRepository(false),
        now,
        10,
        30,
      ),
    ).rejects.toBeInstanceOf(MotoboyOfflineError);
  });

  it("limita atualizações excessivas no backend", async () => {
    const repository = createRepository(true);
    repository.current.lastLocationAt = new Date(now.getTime() - 10_000);
    await expect(
      updateMotoboyLocation(actor, coordinates, repository, now, 10, 30),
    ).rejects.toBeInstanceOf(PresenceRateLimitError);
  });

  it("permite que o motoboy fique offline", async () => {
    const repository = createRepository(true);
    const result = await setMotoboyOffline(actor, repository, now, 10);
    expect(result.isOnline).toBe(false);
    expect(repository.current.isOnline).toBe(false);
  });

  it("encerra a presença no logout normal", async () => {
    const repository = createRepository(true);
    await endPresenceOnLogout(
      {
        id: userId,
        name: "Motoboy",
        email: "motoboy@example.com",
        role: "MOTOBOY",
        status: "ACTIVE",
      },
      repository,
      now,
    );
    expect(repository.setOffline).toHaveBeenCalledWith(userId, now);
    expect(repository.current.isOnline).toBe(false);
  });

  it("não considera presença expirada como disponível", async () => {
    const repository = createRepository(true);
    repository.current.lastLocationAt = new Date(now.getTime() - 11 * 60_000);
    const result = await getMotoboyPresence(actor, repository, now, 10);
    expect(result.isOnline).toBe(false);
    expect(result.onlineSince).toBeNull();
  });

  it("calcula distância coerente em linha reta", () => {
    const petrolina = { latitude: -9.3891, longitude: -40.5031 };
    const juazeiro = { latitude: -9.4162, longitude: -40.5033 };
    expect(calculateDistanceKm(petrolina, petrolina)).toBe(0);
    expect(calculateDistanceKm(petrolina, juazeiro)).toBeCloseTo(3.01, 1);
  });
});
