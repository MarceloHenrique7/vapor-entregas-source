import {
  calculateStraightLineDistance,
  type Coordinates,
} from "@/lib/maps/geo";
import { getDistanceEnv } from "@/server/config/env";

export interface DistanceEstimate {
  distanceKm: number;
  method: "STRAIGHT_LINE";
  isRoadDistance: false;
}

export interface DistanceProvider {
  estimate(from: Coordinates, to: Coordinates): Promise<DistanceEstimate>;
}

export class StraightLineDistanceProvider implements DistanceProvider {
  async estimate(from: Coordinates, to: Coordinates) {
    return {
      distanceKm: calculateStraightLineDistance(from, to),
      method: "STRAIGHT_LINE" as const,
      isRoadDistance: false as const,
    };
  }
}

export function getDistanceProvider(): DistanceProvider {
  const provider = getDistanceEnv().DISTANCE_PROVIDER;
  if (provider === "straight_line") return new StraightLineDistanceProvider();
  return new StraightLineDistanceProvider();
}
