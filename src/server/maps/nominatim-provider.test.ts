import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createNominatimProvider } from "./nominatim-provider";

describe("NominatimProvider", () => {
  it("limita sugestões, normaliza o endereço e reutiliza o cache", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/search");
      expect(url.searchParams.get("limit")).toBe("5");
      expect(url.searchParams.get("countrycodes")).toBe("br");
      return new Response(
        JSON.stringify([
          {
            lat: "-9.3891",
            lon: "-40.5031",
            display_name: "Avenida Guararapes, Centro, Petrolina, PE",
            address: {
              road: "Avenida Guararapes",
              neighbourhood: "Centro",
              postcode: "56300-000",
              city: "Petrolina",
              state: "Pernambuco",
            },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const provider = createNominatimProvider({
      baseUrl: "https://nominatim.openstreetmap.org",
      userAgent: "VaporTests/1.0",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    const query = {
      query: "Avenida Guararapes",
      city: "PETROLINA_PE" as const,
    };
    const first = await provider.search(query, 10);
    const cached = await provider.search(query, 10);

    expect(first).toEqual(cached);
    expect(first[0]).toMatchObject({
      latitude: -9.3891,
      longitude: -40.5031,
      address: {
        road: "Avenida Guararapes",
        neighborhood: "Centro",
        postalCode: "56300-000",
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});
