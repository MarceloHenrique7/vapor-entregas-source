import { describe, expect, it } from "vitest";

import {
  canonicalLocationFromResult,
  completeCanonicalAddress,
  createPinnedLocationFallback,
  createLatestRequestGate,
  isLocationDefiningAddressField,
  mergeCanonicalAddress,
  normalizeGeocodingResult,
  resolveSupportedCity,
} from "./location";

describe("localização canônica", () => {
  it("normaliza coordenadas e componentes estruturados do provedor", () => {
    expect(
      normalizeGeocodingResult({
        latitude: -9.3891004,
        longitude: -40.5031004,
        displayName: "  Avenida Guararapes, Petrolina  ",
        address: {
          road: " Avenida Guararapes ",
          houseNumber: "120",
          neighborhood: "Centro",
          postalCode: "56300-000",
        },
      }),
    ).toEqual({
      latitude: -9.3891,
      longitude: -40.5031,
      formattedAddress: "Avenida Guararapes, Petrolina",
      components: {
        street: "Avenida Guararapes",
        number: "120",
        neighborhood: "Centro",
        postalCode: "56300-000",
      },
    });
  });

  it("rejeita coordenadas inválidas sem rejeitar zero isoladamente", () => {
    expect(
      normalizeGeocodingResult({
        latitude: 0,
        longitude: -40,
        displayName: "Ponto válido",
      }),
    ).not.toBeNull();
    expect(
      normalizeGeocodingResult({
        latitude: Number.NaN,
        longitude: -40,
      }),
    ).toBeNull();
    expect(
      normalizeGeocodingResult({ latitude: 91, longitude: -40 }),
    ).toBeNull();
  });

  it("reverse geocoding descreve o PIN sem reposicioná-lo", () => {
    const location = canonicalLocationFromResult(
      {
        latitude: -9.39,
        longitude: -40.5,
        displayName: "Centro aproximado retornado pelo provedor",
      },
      "pin",
      { latitude: -9.391234, longitude: -40.501234 },
    );
    expect(location).toMatchObject({
      latitude: -9.391234,
      longitude: -40.501234,
      source: "pin",
    });
  });

  it("impede que uma resposta antiga seja tratada como atual", () => {
    const gate = createLatestRequestGate();
    const requestA = gate.next();
    const requestB = gate.next();
    expect(gate.isLatest(requestA)).toBe(false);
    expect(gate.isLatest(requestB)).toBe(true);
    gate.invalidate();
    expect(gate.isLatest(requestB)).toBe(false);
  });

  it("invalida localização por número, mas não por complemento ou referência", () => {
    expect(isLocationDefiningAddressField("number")).toBe(true);
    expect(isLocationDefiningAddressField("street")).toBe(true);
    expect(isLocationDefiningAddressField("complement")).toBe(false);
    expect(isLocationDefiningAddressField("reference")).toBe(false);
  });

  it("normaliza Petrolina e Juazeiro pelos componentes estruturados", () => {
    expect(
      resolveSupportedCity(
        { state: "Bahia", city: "Juazeiro" },
        "PETROLINA_PE",
      ),
    ).toBe("JUAZEIRO_BA");
    expect(
      resolveSupportedCity(
        { state: "Pernambuco", city: "Petrolina" },
        "JUAZEIRO_BA",
      ),
    ).toBe("PETROLINA_PE");
  });

  it("não conserva silenciosamente o número de outra sugestão", () => {
    const current = {
      street: "Rua Antiga",
      number: "99",
      neighborhood: "Centro",
      postalCode: "56300000",
      city: "PETROLINA_PE" as const,
    };
    const location = {
      components: { street: "Rua Nova", neighborhood: "Areia Branca" },
    };
    expect(mergeCanonicalAddress(current, location).number).toBe("");
    expect(mergeCanonicalAddress(current, location, true).number).toBe("99");
  });

  it("aceita um ponto válido quando o provedor não conhece número ou bairro", () => {
    const address = completeCanonicalAddress(
      {
        street: "Rua antiga",
        number: "99",
        neighborhood: "Bairro antigo",
        postalCode: "",
        city: "PETROLINA_PE",
      },
      {
        formattedAddress: "Rua do Caqui, Petrolina, Pernambuco",
        components: { street: "Rua do Caqui", city: "Petrolina" },
      },
    );

    expect(address).toEqual({
      street: "Rua do Caqui",
      number: "s/n",
      neighborhood: "Bairro não informado",
      postalCode: "",
      city: "PETROLINA_PE",
    });
  });

  it("preserva coordenadas mesmo quando o reverse geocoding falha", () => {
    const fallback = createPinnedLocationFallback(
      { latitude: -9.3912344, longitude: -40.5012344 },
      "PETROLINA_PE",
    );

    expect(fallback).toMatchObject({
      address: {
        street: "Local marcado no mapa",
        number: "s/n",
        neighborhood: "Bairro não informado",
      },
      location: {
        latitude: -9.391234,
        longitude: -40.501234,
        source: "pin",
      },
    });
  });
});
