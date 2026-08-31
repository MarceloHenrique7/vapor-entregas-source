import { z } from "zod";

export const checkoutSchema = z
  .object({
    cardTokenId: z
      .string()
      .trim()
      .min(16)
      .max(256)
      .regex(/^[A-Za-z0-9._-]+$/),
    clientDiagnostics: z
      .object({
        publicKeyConfigured: z.boolean(),
        publicKeyEnvironment: z.enum(["test", "production", "unknown"]),
        publicKeyHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const cancelSchema = z.object({ confirm: z.literal(true) }).strict();
export const planIdSchema = z.string().uuid();
export const updatePlanSchema = z
  .object({
    monthlyPrice: z.coerce.number().finite().min(0).max(10_000),
    active: z.boolean(),
    trialDays: z.coerce.number().int().min(0).max(365),
  })
  .strict();

export const mercadoPagoWebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    type: z.string().max(100),
    action: z.string().max(100).optional(),
    live_mode: z.boolean().optional(),
    data: z.object({ id: z.union([z.string(), z.number()]) }),
  })
  .passthrough();
