import "server-only";

import type { GeocodingQuery } from "@/server/locations/schemas";

import { GeocodingUnavailableError } from "./errors";
import type { GeocodingProvider, GeocodingResult } from "./types";

interface NominatimOptions {
  baseUrl: string;
  userAgent: string;
  cacheTtlSeconds: number;
  fetchImplementation?: typeof fetch;
}

interface NominatimItem {
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
  };
}

interface CacheEntry {
  expiresAt: number;
  value: GeocodingResult[];
}

const MAX_CACHE_ENTRIES = 500;
const MIN_REQUEST_INTERVAL_MS = 1100;
const cache = new Map<string, CacheEntry>();

const globalRateLimit = globalThis as typeof globalThis & {
  vaporEntregasNominatimLastRequestAt?: number;
  vaporEntregasNominatimQueue?: Promise<void>;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
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
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    displayName: item.display_name ?? "Endereço aproximado",
    address: item.address
      ? {
          road: item.address.road ?? item.address.pedestrian,
          houseNumber: item.address.house_number,
          neighborhood:
            item.address.neighbourhood ??
            item.address.suburb ??
            item.address.quarter,
          postalCode: item.address.postcode,
          city:
            item.address.city ?? item.address.town ?? item.address.municipality,
          state: item.address.state,
        }
      : undefined,
  };
}

export function createNominatimProvider({
  baseUrl,
  userAgent,
  cacheTtlSeconds,
  fetchImplementation = fetch,
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
      const city = query.city === "PETROLINA_PE" ? "Petrolina" : "Juazeiro";
      const parts = [
        `${query.address}, ${query.number}`,
        query.neighborhood,
        city,
        query.state,
        query.postalCode,
        "Brasil",
      ].filter(Boolean);
      const searchText = parts.join(", ");
      const url = new URL("search", `${baseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("q", searchText);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("limit", "1");
      return (
        (await request(url, `search:${normalize(searchText)}:1`))[0] ?? null
      );
    },

    async search(query, limit = 5) {
      const city =
        query.city === "PETROLINA_PE" ? "Petrolina, PE" : "Juazeiro, BA";
      const safeLimit = Math.max(1, Math.min(5, Math.trunc(limit)));
      const searchText = `${query.query}, ${city}, Brasil`;
      const url = new URL("search", `${baseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("q", searchText);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("limit", String(safeLimit));
      return request(url, `suggestions:${normalize(searchText)}:${safeLimit}`);
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
