import "server-only";

import { normalizeGeocodingResult } from "@/lib/maps/location";
import type { Coordinates } from "@/lib/maps/geo";
import type {
  GeocodingQuery,
  GeocodingSuggestionQuery,
} from "@/server/locations/schemas";

import { GeocodingUnavailableError } from "./errors";
import type { PostalCodeLookup, PostalCodeResult } from "./nominatim-provider";
import type { GeocodingProvider, GeocodingResult } from "./types";

interface TomTomOptions {
  baseUrl: string;
  apiKey: string;
  cacheTtlSeconds: number;
  fetchImplementation?: typeof fetch;
  postalCodeLookup?: PostalCodeLookup;
}

interface TomTomAddress {
  streetNumber?: unknown;
  streetName?: unknown;
  municipalitySubdivision?: unknown;
  municipality?: unknown;
  localName?: unknown;
  countrySecondarySubdivision?: unknown;
  countrySubdivision?: unknown;
  countrySubdivisionCode?: unknown;
  postalCode?: unknown;
  country?: unknown;
  freeformAddress?: unknown;
}

interface TomTomItem {
  id?: unknown;
  type?: unknown;
  address?: TomTomAddress;
  position?: { lat?: unknown; lon?: unknown };
  poi?: { name?: unknown };
}

interface TomTomSearchResponse {
  results?: TomTomItem[];
  addresses?: Array<{
    id?: unknown;
    address?: TomTomAddress;
    position?: TomTomItem["position"];
  }>;
}

interface CacheEntry {
  expiresAt: number;
  value: GeocodingResult[];
}

const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

const citySearchConfig = {
  PETROLINA_PE: {
    city: "Petrolina",
    state: "Pernambuco",
    stateCode: "PE",
  },
  JUAZEIRO_BA: {
    city: "Juazeiro",
    state: "Bahia",
    stateCode: "BA",
  },
} as const;

function text(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: GeocodingResult[], ttlSeconds: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function parseAddress(
  item: TomTomItem,
  fallbackCoordinates?: Coordinates,
): GeocodingResult | null {
  const latitude = Number(item.position?.lat ?? fallbackCoordinates?.latitude);
  const longitude = Number(
    item.position?.lon ?? fallbackCoordinates?.longitude,
  );
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const address = item.address ?? {};
  const street = text(address.streetName);
  const number = text(address.streetNumber);
  const neighborhood =
    text(address.municipalitySubdivision) ??
    text(address.localName) ??
    text(address.countrySecondarySubdivision);
  const city = text(address.municipality) ?? text(address.localName);
  const state =
    text(address.countrySubdivision) ?? text(address.countrySubdivisionCode);
  const postalCode = text(address.postalCode);
  const country = text(address.country);
  const formattedAddress =
    text(address.freeformAddress) ??
    [
      street && number ? `${street}, ${number}` : street,
      neighborhood,
      city,
      state,
    ]
      .filter(Boolean)
      .join(", ") ??
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const displayName = text(item.poi?.name) ?? formattedAddress;

  const normalized = normalizeGeocodingResult({
    latitude,
    longitude,
    formattedAddress,
    displayName,
    placeId: text(item.id),
    components: {
      street,
      number,
      neighborhood,
      city,
      state,
      postalCode,
      country,
    },
  });
  if (!normalized) return null;

  return {
    ...normalized,
    displayName,
    address: {
      road: normalized.components.street,
      houseNumber: normalized.components.number,
      neighborhood: normalized.components.neighborhood,
      postalCode: normalized.components.postalCode,
      city: normalized.components.city,
      state: normalized.components.state,
    },
  };
}

function resultItems(payload: TomTomSearchResponse | null) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.results)) return payload.results;
  return (payload.addresses ?? []).map((item) => ({
    id: item.id,
    address: item.address,
    position: item.position,
  }));
}

function enrichPostalResult(
  result: GeocodingResult,
  postalAddress: PostalCodeResult,
) {
  const components = {
    ...result.components,
    street: postalAddress.street || result.components.street,
    neighborhood: postalAddress.neighborhood || result.components.neighborhood,
    city: postalAddress.city || result.components.city,
    state: postalAddress.state || result.components.state,
    postalCode: postalAddress.postalCode || result.components.postalCode,
  };
  return {
    ...result,
    components,
    address: {
      ...result.address,
      road: components.street,
      neighborhood: components.neighborhood,
      city: components.city,
      state: components.state,
      postalCode: components.postalCode,
    },
  };
}

function inRequestedCity(
  result: GeocodingResult,
  city: keyof typeof citySearchConfig,
) {
  const config = citySearchConfig[city];
  const cityText = normalize(result.components.city ?? "");
  const stateText = normalize(result.components.state ?? "");
  if (!cityText && !stateText) return true;
  return (
    cityText.includes(normalize(config.city)) ||
    stateText === normalize(config.state) ||
    stateText.includes(normalize(config.stateCode))
  );
}

export function createTomTomProvider({
  baseUrl,
  apiKey,
  cacheTtlSeconds,
  fetchImplementation = fetch,
  postalCodeLookup,
}: TomTomOptions): GeocodingProvider {
  const rootUrl = baseUrl.replace(/\/$/, "");

  async function request(
    path: string,
    params: Record<string, string>,
    cacheKey: string,
  ) {
    const scopedCacheKey = `${rootUrl}:${cacheKey}`;
    const cached = getCached(scopedCacheKey);
    if (cached !== undefined) return cached;

    const url = new URL(`${rootUrl}${path}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    url.searchParams.set("key", apiKey);

    let response: Response;
    try {
      response = await fetchImplementation(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new GeocodingUnavailableError();
    }
    if (!response.ok) throw new GeocodingUnavailableError();

    let payload: TomTomSearchResponse | null;
    try {
      payload = (await response.json()) as TomTomSearchResponse;
    } catch {
      throw new GeocodingUnavailableError();
    }
    const results = resultItems(payload)
      .map((item) => parseAddress(item))
      .filter((item): item is GeocodingResult => Boolean(item));
    setCached(scopedCacheKey, results, cacheTtlSeconds);
    return results;
  }

  function searchText(
    query: string,
    city: keyof typeof citySearchConfig,
    postalAddress?: PostalCodeResult | null,
  ) {
    const config = citySearchConfig[city];
    return [
      postalAddress?.street ?? query,
      config.city,
      config.stateCode,
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");
  }

  return {
    async geocode(query: GeocodingQuery) {
      const cityConfig = citySearchConfig[query.city];
      const postalCode = query.postalCode
        ? normalizePostalCode(query.postalCode)
        : null;
      const postalAddress =
        postalCodeLookup && postalCode
          ? await postalCodeLookup(postalCode)
          : null;
      const address =
        postalAddress && normalizePostalCode(query.address)
          ? postalAddress.street
          : query.address;
      const textQuery = [
        query.number ? `${address}, ${query.number}` : address,
        query.neighborhood || postalAddress?.neighborhood,
        cityConfig.city,
        cityConfig.stateCode,
        "Brasil",
      ]
        .filter(Boolean)
        .join(", ");
      const results = await request(
        `/search/2/geocode/${encodeURIComponent(textQuery)}.json`,
        { language: "pt-BR", countrySet: "BR", limit: "5" },
        `geocode:${normalize(textQuery)}`,
      );
      const result =
        results.find((item) => inRequestedCity(item, query.city)) ??
        results[0] ??
        null;
      return result && postalAddress
        ? enrichPostalResult(result, postalAddress)
        : result;
    },

    async search(query: GeocodingSuggestionQuery, limit = 5) {
      const safeLimit = Math.max(1, Math.min(5, Math.trunc(limit)));
      const postalCode = normalizePostalCode(query.query);
      const postalAddress =
        postalCodeLookup && postalCode
          ? await postalCodeLookup(postalCode)
          : null;
      const textQuery = searchText(query.query, query.city, postalAddress);
      const results = await request(
        `/search/2/search/${encodeURIComponent(textQuery)}.json`,
        {
          language: "pt-BR",
          countrySet: "BR",
          limit: String(safeLimit),
          typeahead: "true",
        },
        `search:${normalize(textQuery)}:${safeLimit}`,
      );
      return results
        .filter((item) => inRequestedCity(item, query.city))
        .slice(0, safeLimit)
        .map((item) =>
          postalAddress ? enrichPostalResult(item, postalAddress) : item,
        );
    },

    async reverse(coordinates: Coordinates) {
      const latitude = coordinates.latitude.toFixed(6);
      const longitude = coordinates.longitude.toFixed(6);
      const results = await request(
        `/search/2/reverseGeocode/${latitude},${longitude}.json`,
        { language: "pt-BR" },
        `reverse:${latitude}:${longitude}`,
      );
      return results[0] ?? null;
    },
  };
}
