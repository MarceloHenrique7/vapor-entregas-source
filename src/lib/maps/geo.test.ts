import { describe, expect, it } from "vitest";

import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  calculateStraightLineDistance,
} from "./geo";

describe("utilitários geográficos", () => {
  it("gera links de Google Maps e Waze com as coordenadas", () => {
    expect(buildGoogleMapsUrl(-9.3891, -40.5031)).toBe(
      "https://www.google.com/maps/search/?api=1&query=-9.3891%2C-40.5031",
    );
    expect(buildWazeUrl(-9.3891, -40.5031)).toBe(
      "https://www.waze.com/ul?ll=-9.3891%2C-40.5031&navigate=yes",
    );
  });

  it("calcula distância em linha reta e retorna zero para o mesmo ponto", () => {
    const petrolina = { latitude: -9.3891, longitude: -40.5031 };
    const juazeiro = { latitude: -9.4162, longitude: -40.5033 };
    expect(calculateStraightLineDistance(petrolina, petrolina)).toBe(0);
    expect(calculateStraightLineDistance(petrolina, juazeiro)).toBeCloseTo(
      3.01,
      1,
    );
  });
});
