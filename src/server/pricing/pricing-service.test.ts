import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import type { DistanceProvider } from "@/server/routing/distance-provider";

import {
  buildDeliveryQuote,
  calculateSuggestedPrice,
  quoteDelivery,
  replacePricingRule,
} from "./pricing-service";
import type { PricingRepository, PricingRuleRecord } from "./types";

const now = new Date("2026-08-28T13:00:00.000Z");
const rule: PricingRuleRecord = {
  id: "14000000-0000-4000-8000-000000000001",
  city: "PETROLINA_PE",
  basePrice: 8,
  pricePerKm: 2,
  minimumPrice: 12,
  enabled: true,
  activeFrom: now,
  activeTo: null,
  createdAt: now,
};

const pickup = {
  companyId: "3fbb8fad-c278-4487-a295-b7077f3352bf",
  companyName: "Mercado do Vale",
  locationId: "35009983-4c2f-4e54-8d48-f597ff685732",
  label: "Loja principal",
  address: "Avenida Guararapes",
  number: "120",
  neighborhood: "Centro",
  city: "PETROLINA_PE" as const,
  state: "PE",
  latitude: -9.3891,
  longitude: -40.5031,
};

function repository(
  overrides: Partial<PricingRepository> = {},
): PricingRepository {
  return {
    getCompanyPickup: vi.fn().mockResolvedValue(pickup),
    getActiveRule: vi.fn().mockResolvedValue(rule),
    listRules: vi.fn().mockResolvedValue([rule]),
    replaceActiveRule: vi.fn().mockResolvedValue(rule),
    ...overrides,
  };
}

const distanceProvider: DistanceProvider = {
  estimate: vi.fn().mockResolvedValue({
    distanceKm: 3.456,
    method: "STRAIGHT_LINE",
    isRoadDistance: false,
  }),
};

describe("precificação sugerida", () => {
  it("aplica preço-base, preço por km e arredondamento monetário", () => {
    expect(calculateSuggestedPrice(rule, 3.456)).toBe(14.91);
  });

  it("respeita o preço mínimo", () => {
    expect(calculateSuggestedPrice(rule, 0.2)).toBe(12);
  });

  it("arredonda distância e registra método e regra usados", async () => {
    await expect(
      buildDeliveryQuote(
        pickup,
        { latitude: -9.37, longitude: -40.49 },
        repository(),
        distanceProvider,
        now,
      ),
    ).resolves.toEqual({
      distanceEstimateKm: 3.46,
      distanceMethod: "STRAIGHT_LINE",
      routeDurationSeconds: null,
      routeCalculatedAt: now,
      distanceLabel:
        "Estimativa em linha reta; não representa distância viária.",
      suggestedPrice: 14.92,
      pricingRuleId: rule.id,
    });
  });

  it("mantém a cotação disponível sem regra ativa", async () => {
    const quote = await buildDeliveryQuote(
      pickup,
      { latitude: -9.37, longitude: -40.49 },
      repository({ getActiveRule: vi.fn().mockResolvedValue(null) }),
      distanceProvider,
      now,
    );
    expect(quote.suggestedPrice).toBeNull();
    expect(quote.pricingRuleId).toBeNull();
  });

  it("protege a cotação por autenticação e role", async () => {
    const input = {
      destinationLatitude: -9.37,
      destinationLongitude: -40.49,
      destinationCity: "PETROLINA_PE",
    };
    await expect(
      quoteDelivery(null, input, repository(), distanceProvider, now),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      quoteDelivery(
        { userId: "motoboy", role: "MOTOBOY", status: "ACTIVE" },
        input,
        repository(),
        distanceProvider,
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("somente ADMIN ativo cria nova versão de regra", async () => {
    const repo = repository();
    const input = {
      city: "PETROLINA_PE",
      basePrice: 9,
      pricePerKm: 2.5,
      minimumPrice: 13,
    };
    await expect(
      replacePricingRule(
        { userId: "company", role: "COMPANY", status: "ACTIVE" },
        input,
        repo,
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await replacePricingRule(
      { userId: "admin", role: "ADMIN", status: "ACTIVE" },
      input,
      repo,
      now,
    );
    expect(repo.replaceActiveRule).toHaveBeenCalledWith("admin", input, now);
  });
});
