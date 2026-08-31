import { z } from "zod";

import { DELIVERY_EXTRA_TYPES, DELIVERY_STATUSES } from "./types";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

const postalCode = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (value) => value === "" || value.length === 8,
    "Informe um CEP válido.",
  )
  .transform((value) => value || undefined)
  .optional();

const coordinates = z.object({
  destinationLatitude: z
    .number()
    .finite()
    .min(-90)
    .max(90)
    .transform((value) => Math.round(value * 1_000_000) / 1_000_000),
  destinationLongitude: z
    .number()
    .finite()
    .min(-180)
    .max(180)
    .transform((value) => Math.round(value * 1_000_000) / 1_000_000),
});

export const deliveryExtraInputSchema = z.object({
  type: z.enum(DELIVERY_EXTRA_TYPES),
  description: z
    .string()
    .trim()
    .min(3)
    .max(240)
    .refine((value) => !/[<>]/.test(value), "Não use marcação HTML."),
  amount: z.coerce.number().finite().min(0).max(10_000).optional(),
  note: z
    .string()
    .trim()
    .max(300)
    .refine((value) => !/[<>]/.test(value), "Não use marcação HTML.")
    .transform((value) => value || undefined)
    .optional(),
});

export const createDeliverySchema = z
  .object({
    destinationAddress: z.string().trim().min(3).max(180),
    destinationNumber: z.string().trim().min(1).max(20),
    destinationNeighborhood: z.string().trim().min(2).max(100),
    destinationComplement: optionalText(120),
    destinationReference: optionalText(180),
    destinationCity: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]),
    destinationState: z.enum(["PE", "BA"]),
    destinationPostalCode: postalCode,
    offeredPrice: z.coerce.number().finite().positive().max(10_000),
    paymentMethod: z.enum(["PIX", "CASH", "COMPANY_SETTLEMENT", "OTHER"]),
    notes: optionalText(500),
    extras: z.array(deliveryExtraInputSchema).max(10).optional(),
  })
  .and(coordinates)
  .refine(
    (data) =>
      (data.destinationCity === "PETROLINA_PE" &&
        data.destinationState === "PE") ||
      (data.destinationCity === "JUAZEIRO_BA" &&
        data.destinationState === "BA"),
    {
      path: ["destinationState"],
      message: "Cidade e estado não correspondem.",
    },
  );

export const deliveryIdSchema = z.string().uuid();
export const acceptDeliverySchema = z.object({
  extrasAcknowledged: z.boolean().default(false),
});
export const transitionDeliverySchema = z.object({
  status: z.enum([
    "MOTOBOY_TO_PICKUP",
    "ARRIVED_AT_PICKUP",
    "PICKED_UP",
    "IN_DELIVERY",
    "COMPLETED",
  ]),
  note: optionalText(300),
});
export const cancelDeliverySchema = z.object({
  reason: optionalText(300),
});
export const deliveryHistoryFilterSchema = z
  .object({
    status: z.enum(DELIVERY_STATUSES).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(({ from, to }) => !from || !to || new Date(from) <= new Date(to), {
    message: "O período inicial deve ser anterior ao final.",
    path: ["to"],
  });
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type DeliveryHistoryFilter = z.infer<typeof deliveryHistoryFilterSchema>;
