import type { Coordinates } from "@/lib/maps/geo";
import type {
  AddressComponents,
  GeocodingResultPayload,
} from "@/lib/maps/location";
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

export interface GeocodingResult extends GeocodingResultPayload {
  displayName: string;
  formattedAddress: string;
  components: AddressComponents;
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
