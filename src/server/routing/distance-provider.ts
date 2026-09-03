import type { Coordinates } from "@/lib/maps/geo";
import { getDistanceEnv } from "@/server/config/env";
import { logRouteDiagnostic } from "@/server/observability/logger";

import { GoogleRoutesDistanceProvider } from "./google-routes";
import { StraightLineDistanceProvider } from "./straight-line";
import type {
  DistanceEstimate,
  DistanceEstimateOptions,
  DistanceProvider,
  RouteType,
} from "./types";

export type {
  DistanceEstimate,
  DistanceEstimateOptions,
  DistanceMethod,
  DistanceProvider,
  RouteType,
} from "./types";
export { GoogleRoutesDistanceProvider } from "./google-routes";
export { StraightLineDistanceProvider } from "./straight-line";

const PICKUP_ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 1_000;

interface CachedEstimate {
  expiresAt: number;
  value: DistanceEstimate;
}

function coordinateKey(coordinates: Coordinates, precision: number) {
  return `${coordinates.latitude.toFixed(precision)},${coordinates.longitude.toFixed(precision)}`;
}

export class ResilientCachedDistanceProvider implements DistanceProvider {
  private readonly cache = new Map<string, CachedEstimate>();
  private readonly inFlight = new Map<string, Promise<DistanceEstimate>>();

  constructor(
    private readonly configuredProvider: "straight_line" | "google_routes",
    private readonly primary: DistanceProvider,
    private readonly fallback: DistanceProvider,
    private readonly courierTtlMs: number,
  ) {}

  private key(
    from: Coordinates,
    to: Coordinates,
    options: DistanceEstimateOptions,
  ) {
    const routeType = options.routeType ?? "pickup_to_dropoff";
    const precision = routeType === "courier_to_pickup" ? 3 : 5;
    return [
      routeType,
      options.cacheNamespace ?? "shared",
      coordinateKey(from, precision),
      coordinateKey(to, precision),
    ].join(":");
  }

  private ttl(options: DistanceEstimateOptions) {
    if (options.cacheTtlMs) return options.cacheTtlMs;
    return options.routeType === "courier_to_pickup"
      ? this.courierTtlMs
      : PICKUP_ROUTE_CACHE_TTL_MS;
  }

  private prune(now: number) {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  private diagnostic(
    routeType: RouteType,
    cacheHit: boolean,
    estimate: DistanceEstimate,
    startedAt: number,
  ) {
    logRouteDiagnostic({
      provider: this.configuredProvider,
      cacheHit,
      routeType,
      success:
        this.configuredProvider === "straight_line" || estimate.isRoadDistance,
      durationMs: Math.max(0, Date.now() - startedAt),
    });
  }

  async estimate(
    from: Coordinates,
    to: Coordinates,
    options: DistanceEstimateOptions = {},
  ) {
    const startedAt = Date.now();
    const routeType = options.routeType ?? "pickup_to_dropoff";
    const key = this.key(from, to, options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > startedAt) {
      this.diagnostic(routeType, true, cached.value, startedAt);
      return cached.value;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      const estimate = await pending;
      this.diagnostic(routeType, true, estimate, startedAt);
      return estimate;
    }

    const request = (async () => {
      let estimate: DistanceEstimate;
      try {
        estimate = await this.primary.estimate(from, to, options);
      } catch {
        estimate = {
          ...(await this.fallback.estimate(from, to, options)),
          fallbackUsed: this.configuredProvider === "google_routes",
        };
      }
      this.prune(Date.now());
      this.cache.set(key, {
        expiresAt: Date.now() + this.ttl(options),
        value: estimate,
      });
      return estimate;
    })();

    this.inFlight.set(key, request);
    try {
      const estimate = await request;
      this.diagnostic(routeType, false, estimate, startedAt);
      return estimate;
    } finally {
      this.inFlight.delete(key);
    }
  }
}

let singleton:
  { signature: string; provider: ResilientCachedDistanceProvider } | undefined;

export function getDistanceProvider(): DistanceProvider {
  const env = getDistanceEnv();
  const signature = [
    env.DISTANCE_PROVIDER,
    Boolean(env.GOOGLE_MAPS_API_KEY),
    env.GOOGLE_ROUTES_API_BASE_URL,
    env.GOOGLE_ROUTES_TIMEOUT_MS,
    env.ROUTE_CACHE_TTL_SECONDS,
  ].join(":");
  if (singleton?.signature === signature) return singleton.provider;

  const straightLine = new StraightLineDistanceProvider();
  const primary =
    env.DISTANCE_PROVIDER === "google_routes"
      ? new GoogleRoutesDistanceProvider({
          apiKey: env.GOOGLE_MAPS_API_KEY,
          baseUrl: env.GOOGLE_ROUTES_API_BASE_URL,
          timeoutMs: env.GOOGLE_ROUTES_TIMEOUT_MS,
        })
      : straightLine;
  const provider = new ResilientCachedDistanceProvider(
    env.DISTANCE_PROVIDER,
    primary,
    straightLine,
    env.ROUTE_CACHE_TTL_SECONDS * 1_000,
  );
  singleton = { signature, provider };
  return provider;
}
