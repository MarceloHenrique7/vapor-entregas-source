import "server-only";

import { getMapsEnv } from "@/server/config/env";

import { GeocodingUnavailableError } from "./errors";
import {
  createNominatimProvider,
  createViaCepPostalCodeLookup,
} from "./nominatim-provider";
import { createTomTomProvider } from "./tomtom-provider";
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
  if (env.GEOCODING_PROVIDER === "tomtom") {
    if (!env.TOMTOM_API_KEY) {
      throw new GeocodingUnavailableError(
        "O provider TomTom esta selecionado, mas TOMTOM_API_KEY nao foi configurada.",
      );
    }
    return createTomTomProvider({
      baseUrl: env.TOMTOM_BASE_URL,
      apiKey: env.TOMTOM_API_KEY,
      cacheTtlSeconds: env.GEOCODING_CACHE_TTL_SECONDS,
      postalCodeLookup: createViaCepPostalCodeLookup(),
    });
  }
  return createNominatimProvider({
    baseUrl: env.GEOCODING_BASE_URL,
    userAgent: env.GEOCODING_USER_AGENT,
    cacheTtlSeconds: env.GEOCODING_CACHE_TTL_SECONDS,
    postalCodeLookup: createViaCepPostalCodeLookup(),
  });
}
