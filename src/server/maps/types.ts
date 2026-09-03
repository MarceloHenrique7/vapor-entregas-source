import type { Coordinates } from "@/lib/maps/geo";
import type {
  GeocodingQuery,
  GeocodingSuggestionQuery,
} from "@/server/locations/schemas";

export interface GeocodingAddress {
  road?: string;
  houseNumber?: string;
  neighborhood?: string;
  postalCode?: string;
  city?: string;
  state?: string;
}

export interface GeocodingResult extends Coordinates {
  displayName: string;
  address?: GeocodingAddress;
}

export interface GeocodingProvider {
  geocode(query: GeocodingQuery): Promise<GeocodingResult | null>;
  search(
    query: GeocodingSuggestionQuery,
    limit?: number,
  ): Promise<GeocodingResult[]>;
  reverse(coordinates: Coordinates): Promise<GeocodingResult | null>;
}
