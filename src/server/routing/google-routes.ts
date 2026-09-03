import type { Coordinates } from "@/lib/maps/geo";

import type { DistanceProvider } from "./types";

export class GoogleRoutesProviderError extends Error {
  constructor(
    readonly reason: "configuration" | "timeout" | "http" | "response",
  ) {
    super("Google Routes indisponível.");
    this.name = "GoogleRoutesProviderError";
  }
}

interface GoogleRoutesProviderOptions {
  apiKey?: string;
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

function parseDurationSeconds(value: unknown) {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?s$/.test(value)) {
    return null;
  }
  const seconds = Number.parseFloat(value.slice(0, -1));
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : null;
}

function waypoint(coordinates: Coordinates) {
  return {
    location: {
      latLng: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    },
  };
}

export class GoogleRoutesDistanceProvider implements DistanceProvider {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: GoogleRoutesProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async estimate(from: Coordinates, to: Coordinates) {
    if (!this.options.apiKey) {
      throw new GoogleRoutesProviderError("configuration");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs,
    );
    let response: Response;

    try {
      response = await this.fetcher(
        `${this.options.baseUrl.replace(/\/$/, "")}/directions/v2:computeRoutes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.options.apiKey,
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: waypoint(from),
            destination: waypoint(to),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_UNAWARE",
            computeAlternativeRoutes: false,
            languageCode: "pt-BR",
            units: "METRIC",
          }),
          signal: controller.signal,
          cache: "no-store",
        },
      );
    } catch (error) {
      throw new GoogleRoutesProviderError(
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "http",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new GoogleRoutesProviderError("http");

    const payload = (await response.json().catch(() => null)) as {
      routes?: Array<{ distanceMeters?: unknown; duration?: unknown }>;
    } | null;
    const route = payload?.routes?.[0];
    const distanceMeters = route?.distanceMeters;
    const durationSeconds = parseDurationSeconds(route?.duration);

    if (
      typeof distanceMeters !== "number" ||
      !Number.isFinite(distanceMeters) ||
      distanceMeters < 0 ||
      durationSeconds === null
    ) {
      throw new GoogleRoutesProviderError("response");
    }

    return {
      distanceKm: distanceMeters / 1_000,
      durationSeconds,
      method: "GOOGLE_ROUTES" as const,
      isRoadDistance: true as const,
    };
  }
}
