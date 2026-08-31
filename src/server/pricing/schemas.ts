import { z } from "zod";

const coordinates = {
  destinationLatitude: z.number().finite().min(-90).max(90),
  destinationLongitude: z.number().finite().min(-180).max(180),
};

export const deliveryQuoteSchema = z.object({
  ...coordinates,
  destinationCity: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]),
});

export const pricingRuleSchema = z
  .object({
    city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]),
    basePrice: z.coerce.number().finite().min(0).max(10_000),
    pricePerKm: z.coerce.number().finite().min(0).max(1_000),
    minimumPrice: z.coerce.number().finite().min(0).max(10_000),
  })
  .strict();

export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;
