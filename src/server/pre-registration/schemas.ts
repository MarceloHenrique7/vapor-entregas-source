import { z } from "zod";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function normalizeBrazilianPhone(value: string) {
  let digits = onlyDigits(value);
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }
  if (!/^[1-9]{2}[2-9]\d{7,8}$/.test(digits)) return null;
  return `+55${digits}`;
}

export function formatBrazilianPhone(normalized: string) {
  const digits = normalized.replace(/^\+55/, "");
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
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
