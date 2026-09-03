import type { Coordinates } from "@/lib/maps/geo";

export type RouteType = "courier_to_pickup" | "pickup_to_dropoff";
export type DistanceMethod = "STRAIGHT_LINE" | "GOOGLE_ROUTES";

export interface DistanceEstimate {
  distanceKm: number;
  durationSeconds: number | null;
  method: DistanceMethod;
  isRoadDistance: boolean;
  fallbackUsed?: boolean;
}

export interface DistanceEstimateOptions {
  routeType?: RouteType;
  cacheNamespace?: string;
  cacheTtlMs?: number;
}

export interface DistanceProvider {
  estimate(
    from: Coordinates,
    to: Coordinates,
    options?: DistanceEstimateOptions,
  ): Promise<DistanceEstimate>;
}

export interface OpportunityRouteEstimateView {
  distanceKm: number;
  durationSeconds: number | null;
  method: DistanceMethod;
  isRoadDistance: boolean;
}
