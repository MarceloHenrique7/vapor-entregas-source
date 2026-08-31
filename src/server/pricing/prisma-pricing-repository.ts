import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { PricingRepository, PricingRuleRecord } from "./types";

function toRecord(rule: {
  id: string;
  city: "PETROLINA_PE" | "JUAZEIRO_BA";
  basePrice: { toNumber(): number };
  pricePerKm: { toNumber(): number };
  minimumPrice: { toNumber(): number };
  enabled: boolean;
  activeFrom: Date;
  activeTo: Date | null;
  createdAt: Date;
}): PricingRuleRecord {
  return {
    ...rule,
    basePrice: rule.basePrice.toNumber(),
    pricePerKm: rule.pricePerKm.toNumber(),
    minimumPrice: rule.minimumPrice.toNumber(),
  };
}

const ruleSelect = {
  id: true,
  city: true,
  basePrice: true,
  pricePerKm: true,
  minimumPrice: true,
  enabled: true,
  activeFrom: true,
  activeTo: true,
  createdAt: true,
} as const;

export const prismaPricingRepository: PricingRepository = {
  async getCompanyPickup(userId) {
    const company = await getPrisma().companyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        fantasyName: true,
        locations: {
          where: {
            isDefault: true,
            latitude: { not: null },
            longitude: { not: null },
          },
          take: 1,
          select: {
            id: true,
            label: true,
            address: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
    const location = company?.locations[0];
    if (!company || !location?.latitude || !location.longitude) return null;
    return {
      companyId: company.id,
      companyName: company.fantasyName,
      locationId: location.id,
      label: location.label,
      address: location.address,
      number: location.number,
      neighborhood: location.neighborhood,
      city: location.city,
      state: location.state,
      latitude: location.latitude.toNumber(),
      longitude: location.longitude.toNumber(),
    };
  },

  async getActiveRule(city, now) {
    const rule = await getPrisma().pricingRule.findFirst({
      where: {
        city,
        enabled: true,
        activeFrom: { lte: now },
        OR: [{ activeTo: null }, { activeTo: { gt: now } }],
      },
      orderBy: { activeFrom: "desc" },
      select: ruleSelect,
    });
    return rule ? toRecord(rule) : null;
  },

  async listRules() {
    const rules = await getPrisma().pricingRule.findMany({
      orderBy: [{ city: "asc" }, { activeFrom: "desc" }],
      take: 100,
      select: ruleSelect,
    });
    return rules.map(toRecord);
  },

  async replaceActiveRule(adminUserId, input, now) {
    const rule = await getPrisma().$transaction(async (transaction) => {
      await transaction.pricingRule.updateMany({
        where: { city: input.city, enabled: true },
        data: { enabled: false, activeTo: now },
      });
      const created = await transaction.pricingRule.create({
        data: { ...input, enabled: true, activeFrom: now, createdAt: now },
        select: ruleSelect,
      });
      await transaction.adminAction.create({
        data: {
          adminUserId,
          actionType: "PRICING_RULE_CHANGED",
          reason: "Nova versão de regra de preço sugerido ativada.",
          metadata: {
            pricingRuleId: created.id,
            city: created.city,
            basePrice: input.basePrice,
            pricePerKm: input.pricePerKm,
            minimumPrice: input.minimumPrice,
          },
          createdAt: now,
        },
      });
      return created;
    });
    return toRecord(rule);
  },
};
