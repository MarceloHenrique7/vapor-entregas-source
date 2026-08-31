import { z } from "zod";

import { deliveryExtraInputSchema } from "@/server/deliveries/schemas";

export const addDeliveryExtraSchema = deliveryExtraInputSchema;
export const respondDeliveryExtraSchema = z.object({
  decision: z.enum(["ACKNOWLEDGED", "REJECTED"]),
  note: z
    .string()
    .trim()
    .max(300)
    .refine((value) => !/[<>]/.test(value), "Não use marcação HTML.")
    .transform((value) => value || undefined)
    .optional(),
});
export const extraIdSchema = z.string().uuid();

export type AddDeliveryExtraInput = z.infer<typeof addDeliveryExtraSchema>;
export type RespondDeliveryExtraInput = z.infer<
  typeof respondDeliveryExtraSchema
>;
