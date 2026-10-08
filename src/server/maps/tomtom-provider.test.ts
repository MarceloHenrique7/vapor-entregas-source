import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GeocodingUnavailableError } from "./errors";
import { createTomTomProvider } from "./tomtom-provider";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TomTomProvider", () => {
  it("consulta sugestÃµes com chave somente no servidor e normaliza o resultado", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/search/2/search/");
      expect(url.searchParams.get("countrySet")).toBe("BR");
      expect(url.searchParams.get("typeahead")).toBe("true");
      expect(url.searchParams.get("key")).toBe("tomtom-test-key");
      return response({
        results: [
          {
            id: "br:addr:1",
            address: {
              streetNumber: "120",
              streetName: "Rua do Caqui",
              municipalitySubdivision: "Centro",
              municipality: "Petrolina",
              countrySubdivision: "Pernambuco",
              postalCode: "56312-640",
              country: "Brasil",
              freeformAddress: "Rua do Caqui, 120, Petrolina - PE",
            },
            position: { lat: -9.3972, lon: -40.5048 },
          },
        ],
      });
    });

    const provider = createTomTomProvider({
      baseUrl: "https://api.tomtom.com",
      apiKey: "tomtom-test-key",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    const result = await provider.search(
      { query: "Rua do Caqui", city: "PETROLINA_PE" },
      5,
    );

    expect(result[0]).toMatchObject({
      latitude: -9.3972,
      longitude: -40.5048,
      placeId: "br:addr:1",
      components: {
        street: "Rua do Caqui",
        number: "120",
        city: "Petrolina",
        state: "Pernambuco",
      },
    });
  });

  it("usa o endpoint de geocoding e consulta CEP antes de montar o resultado", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/search/2/geocode/");
      expect(url.searchParams.get("countrySet")).toBe("BR");
      return response({
        results: [
          {
            id: "br:addr:2",
            address: {
              municipality: "Petrolina",
              countrySubdivisionCode: "PE",
              freeformAddress: "Petrolina, PE, Brasil",
            },
            position: { lat: -9.39, lon: -40.5 },
          },
        ],
      });
    });
    const provider = createTomTomProvider({
      baseUrl: "https://api.tomtom.com",
      apiKey: "tomtom-test-key-2",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
      postalCodeLookup: async () => ({
        postalCode: "56312640",
        street: "Rua do Caqui",
        neighborhood: "Centro",
        city: "Petrolina",
        state: "PE",
      }),
    });

    const result = await provider.geocode({
      address: "56312-640",
      number: undefined,
      neighborhood: undefined,
      city: "PETROLINA_PE",
      state: "PE",
      postalCode: "56312-640",
    });

    expect(result?.components).toMatchObject({
      street: "Rua do Caqui",
      neighborhood: "Centro",
      postalCode: "56312640",
    });
  });

  it("interpreta resposta de reverse geocoding e transforma indisponibilidade em erro de domínio", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          addresses: [
            {
              id: "reverse:1",
              address: {
                streetName: "Avenida Guararapes",
                municipality: "Petrolina",
                countrySubdivision: "Pernambuco",
                freeformAddress: "Avenida Guararapes, Petrolina - PE",
              },
              position: { lat: -9.39, lon: -40.5 },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(response({ error: "quota" }, 429));
    const provider = createTomTomProvider({
      baseUrl: "https://api.tomtom.com",
      apiKey: "tomtom-test-key-3",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    await expect(
      provider.reverse({ latitude: -9.39, longitude: -40.5 }),
    ).resolves.toMatchObject({
      components: { street: "Avenida Guararapes", city: "Petrolina" },
    });
    await expect(
      provider.reverse({ latitude: -9.4, longitude: -40.51 }),
    ).rejects.toBeInstanceOf(GeocodingUnavailableError);
  });
});
