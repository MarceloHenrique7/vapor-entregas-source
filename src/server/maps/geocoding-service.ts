import "server-only";

import { getMapsEnv } from "@/server/config/env";

import { GeocodingUnavailableError } from "./errors";
import { createNominatimProvider } from "./nominatim-provider";
import type { GeocodingProvider } from "./types";

let providerOverride: GeocodingProvider | undefined;

export function setGeocodingProviderForTests(provider?: GeocodingProvider) {
  providerOverride = provider;
}

export function getGeocodingProvider(): GeocodingProvider {
  if (providerOverride) return providerOverride;
  const env = getMapsEnv();
  if (env.GEOCODING_PROVIDER === "disabled") {
    throw new GeocodingUnavailableError(
      "A busca automática está desativada. Ajuste o PIN manualmente no mapa.",
    );
  }
  return createNominatimProvider({
    baseUrl: env.GEOCODING_BASE_URL,
    userAgent: env.GEOCODING_USER_AGENT,
    cacheTtlSeconds: env.GEOCODING_CACHE_TTL_SECONDS,
  });
}
