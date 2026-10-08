import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createNominatimProvider,
  createViaCepPostalCodeLookup,
} from "./nominatim-provider";

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
            place_id: 1234,
            lat: "-9.3891",
            lon: "-40.5031",
            display_name: "Avenida Guararapes, Centro, Petrolina, PE",
            address: {
              road: "Avenida Guararapes",
              neighbourhood: "Centro",
              postcode: "56300-000",
              city: "Petrolina",
              state: "Pernambuco",
              country: "Brasil",
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
      formattedAddress: "Avenida Guararapes, Centro, Petrolina, PE",
      placeId: "1234",
      components: {
        street: "Avenida Guararapes",
        neighborhood: "Centro",
        postalCode: "56300-000",
        city: "Petrolina",
        state: "Pernambuco",
        country: "Brasil",
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("prioriza CEP e restringe a busca à cidade selecionada", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("postalcode")).toBe("56312640");
      expect(url.searchParams.get("q")).toBeNull();
      expect(url.searchParams.get("city")).toBe("Petrolina");
      expect(url.searchParams.get("state")).toBe("Pernambuco");
      expect(url.searchParams.get("bounded")).toBeNull();
      expect(url.searchParams.get("viewbox")).toContain("-40.56");
      return new Response("[]", { status: 200 });
    });
    const provider = createNominatimProvider({
      baseUrl: "https://nominatim.openstreetmap.org",
      userAgent: "VaporTests/1.0",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    await provider.search({ query: "56312-640", city: "PETROLINA_PE" }, 5);

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("usa o CEP para preencher rua e bairro antes de posicionar o PIN", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("viacep.com.br")) {
        return new Response(
          JSON.stringify({
            cep: "56312-640",
            logradouro: "Rua do Caqui",
            bairro: "Rio Corrente",
            localidade: "Petrolina",
            uf: "PE",
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify([
          {
            place_id: 9,
            lat: "-9.3972",
            lon: "-40.5048",
            display_name: "Petrolina, Pernambuco, Brasil",
            address: { city: "Petrolina", state: "Pernambuco" },
          },
        ]),
        { status: 200 },
      );
    });
    const postalCodeLookup = createViaCepPostalCodeLookup({
      fetchImplementation: fetchImplementation as typeof fetch,
    });
    const provider = createNominatimProvider({
      baseUrl: "https://nominatim.openstreetmap.org",
      userAgent: "VaporTests/1.0",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
      postalCodeLookup,
    });

    const result = await provider.search(
      { query: "56312-640", city: "PETROLINA_PE" },
      5,
    );

    expect(result[0]).toMatchObject({
      formattedAddress: "Rua do Caqui, Rio Corrente, Petrolina - PE, 56312-640",
      components: {
        street: "Rua do Caqui",
        neighborhood: "Rio Corrente",
        postalCode: "56312-640",
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("troca um CEP digitado pela rua retornada antes de geocodificar", async () => {
    const fetchImplementation = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("viacep.com.br")) {
        return new Response(
          JSON.stringify({
            cep: "56312-660",
            logradouro: "Rua do Caqui",
            bairro: "Cohab São Francisco",
            localidade: "Petrolina",
            uf: "PE",
          }),
          { status: 200 },
        );
      }
      const parsed = new URL(url);
      expect(parsed.searchParams.get("q")).toContain("Rua do Caqui");
      expect(parsed.searchParams.get("q")).not.toContain("56312660");
      return new Response("[]", { status: 200 });
    });
    const provider = createNominatimProvider({
      baseUrl: "https://nominatim.openstreetmap.org",
      userAgent: "VaporTests/1.0",
      cacheTtlSeconds: 60,
      fetchImplementation: fetchImplementation as typeof fetch,
      postalCodeLookup: createViaCepPostalCodeLookup({
        fetchImplementation: fetchImplementation as typeof fetch,
      }),
    });

    const result = await provider.geocode({
      address: "56312660",
      number: undefined,
      neighborhood: undefined,
      city: "PETROLINA_PE",
      state: "PE",
      postalCode: "56312660",
    });

    expect(result).toBeNull();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
});
