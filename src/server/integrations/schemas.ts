import { z } from "zod";

import { normalizeBrazilPhone } from "@/lib/validators/phone";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

const optionalPhone = z
  .string()
  .trim()
  .max(24)
  .transform((value, context) => {
    if (!value) return undefined;
    const normalized = normalizeBrazilPhone(value);
    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Telefone brasileiro inválido.",
      });
      return z.NEVER;
    }
    return normalized;
  })
  .optional();

export const genericWebhookOrderSchema = z
  .object({
    externalId: z.string().trim().min(1).max(191),
    eventType: z.string().trim().min(1).max(100).default("ORDER_CREATED"),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
    channel: z.string().trim().min(1).max(80).default("Parceiro"),
    status: optionalText(80),
    deliveryMode: z.enum(["MERCHANT", "PLATFORM"]),
    externalCreatedAt: z.iso.datetime({ offset: true }).optional(),
    destination: z
      .object({
        address: optionalText(180),
        number: optionalText(20),
        neighborhood: optionalText(100),
        complement: optionalText(120),
        reference: optionalText(180),
        phone: optionalPhone,
        city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]).optional(),
        state: z.enum(["PE", "BA"]).optional(),
        postalCode: z
          .string()
          .trim()
          .regex(/^\d{8}$/)
          .optional(),
      })
      .default({}),
    notes: optionalText(500),
    storeId: optionalText(120),
  })
  .strict();

export const csvImportSchema = z
  .object({
    csv: z.string().min(1).max(1_000_000),
    confirm: z.boolean().default(false),
  })
  .strict();
