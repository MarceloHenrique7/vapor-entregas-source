import type { Role, UserStatus } from "@/server/auth/types";
import type { CompanyPickupContext } from "@/server/deliveries/types";

export type PricingCity = "PETROLINA_PE" | "JUAZEIRO_BA";

export interface PricingRuleRecord {
  id: string;
  city: PricingCity;
  basePrice: number;
  pricePerKm: number;
  minimumPrice: number;
  enabled: boolean;
  activeFrom: Date;
  activeTo: Date | null;
  createdAt: Date;
}

export interface PricingRuleView extends Omit<
  PricingRuleRecord,
  "activeFrom" | "activeTo" | "createdAt"
> {
  activeFrom: string;
  activeTo: string | null;
  createdAt: string;
}

export interface PricingActor {
  userId: string;
  role: Role;
  status: UserStatus;
}

export interface DeliveryQuote {
  distanceEstimateKm: number;
  distanceMethod: "STRAIGHT_LINE";
  distanceLabel: string;
  suggestedPrice: number | null;
  pricingRuleId: string | null;
}

export interface PricingRepository {
  getCompanyPickup(userId: string): Promise<CompanyPickupContext | null>;
  getActiveRule(
    city: PricingCity,
    now: Date,
  ): Promise<PricingRuleRecord | null>;
  listRules(): Promise<PricingRuleRecord[]>;
  replaceActiveRule(
    adminUserId: string,
    input: {
      city: PricingCity;
      basePrice: number;
      pricePerKm: number;
      minimumPrice: number;
    },
    now: Date,
  ): Promise<PricingRuleRecord>;
}
