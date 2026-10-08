import "server-only";

import { normalizeGeocodingResult } from "@/lib/maps/location";
import type { GeocodingQuery } from "@/server/locations/schemas";

import { GeocodingUnavailableError } from "./errors";
import type { GeocodingProvider, GeocodingResult } from "./types";

interface NominatimOptions {
  baseUrl: string;
  userAgent: string;
  cacheTtlSeconds: number;
  fetchImplementation?: typeof fetch;
  postalCodeLookup?: PostalCodeLookup;
}

export interface PostalCodeResult {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type PostalCodeLookup = (
  postalCode: string,
) => Promise<PostalCodeResult | null>;

interface NominatimItem {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    postcode?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

interface CacheEntry {
  expiresAt: number;
  value: GeocodingResult[];
}

const MAX_CACHE_ENTRIES = 500;
const MIN_REQUEST_INTERVAL_MS = 1100;
const cache = new Map<string, CacheEntry>();
const postalCodeCache = new Map<
  string,
  { value: PostalCodeResult | null; expiresAt: number }
>();

const citySearchConfig = {
  PETROLINA_PE: {
    city: "Petrolina",
    state: "Pernambuco",
    stateCode: "PE",
    viewbox: "-40.56,-9.32,-40.44,-9.46",
  },
  JUAZEIRO_BA: {
    city: "Juazeiro",
    state: "Bahia",
    stateCode: "BA",
    viewbox: "-40.57,-9.35,-40.42,-9.49",
  },
} as const;

const globalRateLimit = globalThis as typeof globalThis & {
  vaporEntregasNominatimLastRequestAt?: number;
  vaporEntregasNominatimQueue?: Promise<void>;
};

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

async function waitForPublicServiceSlot() {
  const previous =
    globalRateLimit.vaporEntregasNominatimQueue ?? Promise.resolve();
  let release: () => void = () => {};
  globalRateLimit.vaporEntregasNominatimQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const elapsed =
    Date.now() - (globalRateLimit.vaporEntregasNominatimLastRequestAt ?? 0);
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed),
    );
  }
  globalRateLimit.vaporEntregasNominatimLastRequestAt = Date.now();
  release();
}

function parseResult(item: NominatimItem | undefined): GeocodingResult | null {
  if (!item?.lat || !item.lon) return null;
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  const normalized = normalizeGeocodingResult({
    latitude,
    longitude,
    formattedAddress: item.display_name,
    ...(item.place_id !== undefined ? { placeId: String(item.place_id) } : {}),
    components: item.address
      ? {
          street: item.address.road ?? item.address.pedestrian,
          number: item.address.house_number,
          neighborhood:
            item.address.neighbourhood ??
            item.address.suburb ??
            item.address.quarter,
          postalCode: item.address.postcode,
          city:
            item.address.city ?? item.address.town ?? item.address.municipality,
          state: item.address.state,
          country: item.address.country,
        }
      : undefined,
  });
  if (!normalized) return null;
  return {
    ...normalized,
    displayName: normalized.formattedAddress,
    address: item.address
      ? {
          road: normalized.components.street,
          houseNumber: normalized.components.number,
          neighborhood: normalized.components.neighborhood,
          postalCode: normalized.components.postalCode,
          city: normalized.components.city,
          state: normalized.components.state,
        }
      : undefined,
  };
}

export function createNominatimProvider({
  baseUrl,
  userAgent,
  cacheTtlSeconds,
  fetchImplementation = fetch,
  postalCodeLookup,
}: NominatimOptions): GeocodingProvider {
  async function request(url: URL, cacheKey: string) {
    const cached = getCached(cacheKey);
    if (cached !== undefined) return cached;

    await waitForPublicServiceSlot();
    let response: Response;
    try {
      response = await fetchImplementation(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": userAgent,
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new GeocodingUnavailableError();
    }
    if (!response.ok) throw new GeocodingUnavailableError();

    const payload = (await response.json()) as NominatimItem | NominatimItem[];
    const items = Array.isArray(payload) ? payload : [payload];
    const results = items
      .map((item) => parseResult(item))
      .filter((item): item is GeocodingResult => Boolean(item));
    setCached(cacheKey, results, cacheTtlSeconds);
    return results;
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
        (postalAddress && normalizePostalCode(query.address)
          ? postalAddress.street
          : query.address) ||
        postalAddress?.street ||
        "";
      const neighborhood = query.neighborhood || postalAddress?.neighborhood;
      const searchText = [
        query.number ? `${address}, ${query.number}` : address,
        postalAddress ? undefined : neighborhood,
        cityConfig.city,
        cityConfig.stateCode,
        "Brasil",
      ]
        .filter(Boolean)
        .join(", ");
      const url = new URL("search", `${baseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("limit", "1");
      url.searchParams.set("viewbox", cityConfig.viewbox);
      if (postalAddress) {
        url.searchParams.set("q", searchText);
      } else if (query.postalCode) {
        url.searchParams.set(
          "street",
          query.number ? `${address}, ${query.number}` : address,
        );
        url.searchParams.set("city", cityConfig.city);
        url.searchParams.set("state", cityConfig.state);
        url.searchParams.set("postalcode", query.postalCode);
        url.searchParams.set("country", "Brasil");
      } else {
        url.searchParams.set("q", searchText);
      }
      const result =
        (await request(url, `search:${normalize(searchText)}:1`))[0] ?? null;
      if (!result || !postalAddress) return result;
      return enrichPostalResult(result, postalAddress);
    },

    async search(query, limit = 5) {
      const cityConfig = citySearchConfig[query.city];
      const safeLimit = Math.max(1, Math.min(5, Math.trunc(limit)));
      const postalCode = normalizePostalCode(query.query);
      const postalAddress =
        postalCodeLookup && postalCode
          ? await postalCodeLookup(postalCode)
          : null;
      const searchText = postalAddress
        ? `${postalAddress.street}, ${cityConfig.city}, ${cityConfig.stateCode}, Brasil`
        : `${query.query}, ${cityConfig.city}, ${cityConfig.stateCode}, Brasil`;
      const url = new URL("search", `${baseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("q", searchText);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("limit", String(safeLimit));
      url.searchParams.set("viewbox", cityConfig.viewbox);
      url.searchParams.set("dedupe", "1");

      if (postalCode && postalAddress) {
        url.searchParams.delete("q");
        url.searchParams.set(
          "q",
          `${postalAddress.street}, ${cityConfig.city}, ${cityConfig.stateCode}, Brasil`,
        );
      } else if (postalCode) {
        url.searchParams.delete("q");
        url.searchParams.set("postalcode", postalCode);
        url.searchParams.set("city", cityConfig.city);
        url.searchParams.set("state", cityConfig.state);
        url.searchParams.set("country", "Brasil");
      } else {
        url.searchParams.set("q", searchText);
      }
      const results = await request(
        url,
        `suggestions:${normalize(searchText)}:${safeLimit}`,
      );
      return postalAddress
        ? results.map((result) => enrichPostalResult(result, postalAddress))
        : results;
    },

    async reverse({ latitude, longitude }) {
      const roundedLatitude = latitude.toFixed(6);
      const roundedLongitude = longitude.toFixed(6);
      const url = new URL("reverse", `${baseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("lat", roundedLatitude);
      url.searchParams.set("lon", roundedLongitude);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("zoom", "18");
      return (
        (
          await request(url, `reverse:${roundedLatitude}:${roundedLongitude}`)
        )[0] ?? null
      );
    },
  };
}

function enrichPostalResult(
  result: GeocodingResult,
  postalAddress: PostalCodeResult,
): GeocodingResult {
  const components = {
    ...result.components,
    street: postalAddress.street,
    neighborhood: postalAddress.neighborhood,
    city: postalAddress.city,
    state: postalAddress.state,
    postalCode: postalAddress.postalCode,
  };
  return {
    ...result,
    formattedAddress: `${postalAddress.street}, ${postalAddress.neighborhood}, ${postalAddress.city} - ${postalAddress.state}, ${postalAddress.postalCode}`,
    displayName: result.displayName,
    components,
    address: {
      ...result.address,
      road: postalAddress.street,
      neighborhood: postalAddress.neighborhood,
      city: postalAddress.city,
      state: postalAddress.state,
      postalCode: postalAddress.postalCode,
    },
  };
}

export function createViaCepPostalCodeLookup({
  fetchImplementation = fetch,
  cacheTtlSeconds = 86400,
}: {
  fetchImplementation?: typeof fetch;
  cacheTtlSeconds?: number;
} = {}): PostalCodeLookup {
  return async (postalCode) => {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) return null;
    const cached = postalCodeCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) postalCodeCache.delete(normalized);

    try {
      const response = await fetchImplementation(
        `https://viacep.com.br/ws/${normalized}/json/`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        erro?: boolean;
        cep?: string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (
        payload.erro ||
        !payload.cep ||
        !payload.logradouro ||
        !payload.bairro ||
        !payload.localidade ||
        !payload.uf
      ) {
        postalCodeCache.set(normalized, {
          value: null,
          expiresAt: Date.now() + cacheTtlSeconds * 1000,
        });
        return null;
      }
      const result: PostalCodeResult = {
        postalCode: payload.cep,
        street: payload.logradouro,
        neighborhood: payload.bairro,
        city: payload.localidade,
        state: payload.uf,
      };
      postalCodeCache.set(normalized, {
        value: result,
        expiresAt: Date.now() + cacheTtlSeconds * 1000,
      });
      if (postalCodeCache.size > 500) {
        const oldest = postalCodeCache.keys().next().value;
        if (oldest) postalCodeCache.delete(oldest);
      }
      return result;
    } catch {
      return null;
    }
  };
}
