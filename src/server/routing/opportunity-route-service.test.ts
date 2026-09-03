import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { MotoboyPresenceRequiredError } from "@/server/deliveries/errors";

import { estimateRouteToOpportunity } from "./opportunity-route-service";
import type { DistanceProvider } from "./types";

const deliveryId = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-09-03T12:00:00.000Z");
const context = {
  motoboy: {
    id: "motoboy-id",
    city: "PETROLINA_PE" as const,
    isOnline: true,
    lastLocationAt: new Date("2026-09-03T11:59:00.000Z"),
    lastLatitude: -9.3891,
    lastLongitude: -40.5031,
  },
  delivery: {
    id: deliveryId,
    pickupLatitude: -9.37,
    pickupLongitude: -40.49,
  },
};

const provider: DistanceProvider = {
  estimate: vi.fn().mockResolvedValue({
    distanceKm: 2.42,
    durationSeconds: 360,
    method: "GOOGLE_ROUTES",
    isRoadDistance: true,
  }),
};

describe("rota do motoboy até a oportunidade", () => {
  it("exige autenticação e papel MOTOBOY", async () => {
    const repository = { getContext: vi.fn() };
    await expect(
      estimateRouteToOpportunity(
        null,
        deliveryId,
        repository,
        provider,
        now,
        10,
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      estimateRouteToOpportunity(
        { userId: "company", role: "COMPANY" },
        deliveryId,
        repository,
        provider,
        now,
        10,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.getContext).not.toHaveBeenCalled();
  });

  it("não calcula rota com presença expirada", async () => {
    const repository = {
      getContext: vi.fn().mockResolvedValue({
        ...context,
        motoboy: {
          ...context.motoboy,
          lastLocationAt: new Date("2026-09-03T11:40:00.000Z"),
        },
      }),
    };
    await expect(
      estimateRouteToOpportunity(
        { userId: "motoboy", role: "MOTOBOY" },
        deliveryId,
        repository,
        provider,
        now,
        10,
      ),
    ).rejects.toBeInstanceOf(MotoboyPresenceRequiredError);
  });

  it("usa namespace por motoboy e oportunidade no cache", async () => {
    const estimate = vi.fn<DistanceProvider["estimate"]>().mockResolvedValue({
      distanceKm: 2.42,
      durationSeconds: 360,
      method: "GOOGLE_ROUTES",
      isRoadDistance: true,
    });
    const repository = { getContext: vi.fn().mockResolvedValue(context) };

    await expect(
      estimateRouteToOpportunity(
        { userId: "motoboy", role: "MOTOBOY" },
        deliveryId,
        repository,
        { estimate },
        now,
        10,
      ),
    ).resolves.toMatchObject({
      distanceKm: 2.42,
      durationSeconds: 360,
      method: "GOOGLE_ROUTES",
    });
    expect(estimate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.objectContaining({
        routeType: "courier_to_pickup",
        cacheNamespace: `motoboy-id:${deliveryId}`,
      }),
    );
  });
});
