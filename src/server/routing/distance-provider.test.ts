import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GoogleRoutesDistanceProvider,
  ResilientCachedDistanceProvider,
  StraightLineDistanceProvider,
  type DistanceProvider,
} from "./distance-provider";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("provedor gratuito de distância", () => {
  it("calcula uma distância coerente e a identifica como linha reta", async () => {
    const estimate = await new StraightLineDistanceProvider().estimate(
      { latitude: -9.3891, longitude: -40.5031 },
      { latitude: -9.37, longitude: -40.49 },
    );
    expect(estimate.distanceKm).toBeGreaterThan(2);
    expect(estimate.distanceKm).toBeLessThan(3);
    expect(estimate.method).toBe("STRAIGHT_LINE");
    expect(estimate.isRoadDistance).toBe(false);
    expect(estimate.durationSeconds).toBeNull();
  });

  it("converte a resposta válida do Google Routes em distância e duração", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [{ distanceMeters: 5_820, duration: "793s" }],
        }),
        { status: 200 },
      ),
    );
    const provider = new GoogleRoutesDistanceProvider({
      apiKey: "server-only-key",
      baseUrl: "https://routes.googleapis.com",
      timeoutMs: 1_000,
      fetcher,
    });

    await expect(
      provider.estimate(
        { latitude: -9.3891, longitude: -40.5031 },
        { latitude: -9.37, longitude: -40.49 },
      ),
    ).resolves.toMatchObject({
      distanceKm: 5.82,
      durationSeconds: 793,
      method: "GOOGLE_ROUTES",
      isRoadDistance: true,
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [, request] = fetcher.mock.calls[0];
    expect(request?.headers).toMatchObject({
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    });
  });

  it("usa linha reta quando o Google retorna erro HTTP", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const failing = new GoogleRoutesDistanceProvider({
      apiKey: "server-only-key",
      baseUrl: "https://routes.googleapis.com",
      timeoutMs: 1_000,
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 503 })),
    });
    const provider = new ResilientCachedDistanceProvider(
      "google_routes",
      failing,
      new StraightLineDistanceProvider(),
      60_000,
    );

    const estimate = await provider.estimate(
      { latitude: -9.3891, longitude: -40.5031 },
      { latitude: -9.37, longitude: -40.49 },
      { routeType: "pickup_to_dropoff" },
    );
    expect(estimate.method).toBe("STRAIGHT_LINE");
    expect(estimate.fallbackUsed).toBe(true);
  });

  it("usa linha reta quando o Google excede o timeout", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const failing = new GoogleRoutesDistanceProvider({
      apiKey: "server-only-key",
      baseUrl: "https://routes.googleapis.com",
      timeoutMs: 5,
      fetcher: vi.fn<typeof fetch>().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }),
    });
    const provider = new ResilientCachedDistanceProvider(
      "google_routes",
      failing,
      new StraightLineDistanceProvider(),
      60_000,
    );

    const estimate = await provider.estimate(
      { latitude: -9.3891, longitude: -40.5031 },
      { latitude: -9.37, longitude: -40.49 },
      { routeType: "courier_to_pickup" },
    );
    expect(estimate.method).toBe("STRAIGHT_LINE");
    expect(estimate.fallbackUsed).toBe(true);
  });

  it("deduplica chamadas e respeita o TTL do cache curto", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const estimate = vi.fn<DistanceProvider["estimate"]>().mockResolvedValue({
      distanceKm: 2.4,
      durationSeconds: 360,
      method: "GOOGLE_ROUTES",
      isRoadDistance: true,
    });
    const primary: DistanceProvider = { estimate };
    const provider = new ResilientCachedDistanceProvider(
      "google_routes",
      primary,
      new StraightLineDistanceProvider(),
      120_000,
    );
    const from = { latitude: -9.3891, longitude: -40.5031 };
    const to = { latitude: -9.37, longitude: -40.49 };
    const options = {
      routeType: "courier_to_pickup" as const,
      cacheNamespace: "motoboy:opportunity",
    };

    await provider.estimate(from, to, options);
    await provider.estimate(from, to, options);
    expect(estimate).toHaveBeenCalledOnce();

    now += 120_001;
    await provider.estimate(from, to, options);
    expect(estimate).toHaveBeenCalledTimes(2);
  });

  it("reutiliza a rota persistente de coleta para destino", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const estimate = vi.fn<DistanceProvider["estimate"]>().mockResolvedValue({
      distanceKm: 8.3,
      durationSeconds: 960,
      method: "GOOGLE_ROUTES",
      isRoadDistance: true,
    });
    const provider = new ResilientCachedDistanceProvider(
      "google_routes",
      { estimate },
      new StraightLineDistanceProvider(),
      60_000,
    );
    const from = { latitude: -9.3891, longitude: -40.5031 };
    const to = { latitude: -9.37, longitude: -40.49 };

    await provider.estimate(from, to, { routeType: "pickup_to_dropoff" });
    await provider.estimate(from, to, { routeType: "pickup_to_dropoff" });

    expect(estimate).toHaveBeenCalledOnce();
  });
});
