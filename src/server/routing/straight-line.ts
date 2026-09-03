import { calculateStraightLineDistance } from "@/lib/maps/geo";

import type { DistanceProvider } from "./types";

export class StraightLineDistanceProvider implements DistanceProvider {
  async estimate(
    from: Parameters<DistanceProvider["estimate"]>[0],
    to: Parameters<DistanceProvider["estimate"]>[1],
  ) {
    return {
      distanceKm: calculateStraightLineDistance(from, to),
      durationSeconds: null,
      method: "STRAIGHT_LINE" as const,
      isRoadDistance: false as const,
    };
  }
}
