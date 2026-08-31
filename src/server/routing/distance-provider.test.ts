import { describe, expect, it } from "vitest";

import { StraightLineDistanceProvider } from "./distance-provider";

describe("provedor gratuito de distância", () => {
  it("calcula uma distância coerente e a identifica como linha reta", async () => {
    const estimate = await new StraightLineDistanceProvider().estimate(
      { latitude: -9.3891, longitude: -40.5031 },
      { latitude: -9.37, longitude: -40.49 },
    );
    expect(estimate.distanceKm).toBeGreaterThan(2);
    expect(estimate.distanceKm).toBeLessThan(3);
    expect(estimate.method).toBe("STRAIGHT_LINE");
    expect(estimate.isRoadDistance).toBe(false);
  });
});
