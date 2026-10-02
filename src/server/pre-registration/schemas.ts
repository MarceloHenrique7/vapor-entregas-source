import { z } from "zod";
import {
  formatBrazilPhoneInput,
  normalizeBrazilPhone,
} from "@/lib/validators/phone";

export function normalizeBrazilianPhone(value: string) {
  return normalizeBrazilPhone(value);
}

export function formatBrazilianPhone(normalized: string) {
  return formatBrazilPhoneInput(normalized);
}

export const preRegistrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(120, "O nome é muito longo.")
      .refine(
        (value) => !/[<>]/.test(value),
        "O nome contém caracteres inválidos.",
      )
      .transform((value) => value.replace(/\s+/g, " ")),
    phone: z
      .string()
      .trim()
      .min(10, "Informe um WhatsApp com DDD.")
      .max(24)
      .transform((value, context) => {
        const normalized = normalizeBrazilianPhone(value);
        if (!normalized) {
          context.addIssue({
            code: "custom",
            message: "Informe um WhatsApp válido com DDD.",
          });
          return z.NEVER;
        }
        return normalized;
      }),
    type: z.enum(["MOTOBOY", "COMPANY"], {
      error: "Escolha Motoboy ou Empresa.",
    }),
  })
  .strict();

const optionalDate = z.iso.date().optional();

export const preRegistrationAdminSearchSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    query: z.string().trim().max(120).optional(),
    type: z.enum(["MOTOBOY", "COMPANY"]).optional(),
    from: optionalDate,
    to: optionalDate,
  })
  .strict();

export const preRegistrationExportSchema = preRegistrationAdminSearchSchema
  .omit({ page: true, pageSize: true })
  .strict();
