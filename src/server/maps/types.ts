import type { Coordinates } from "@/lib/maps/geo";
import type { GeocodingQuery } from "@/server/locations/schemas";

export interface GeocodingResult extends Coordinates {
  displayName: string;
}

export interface GeocodingProvider {
  geocode(query: GeocodingQuery): Promise<GeocodingResult | null>;
  reverse(coordinates: Coordinates): Promise<GeocodingResult | null>;
}
