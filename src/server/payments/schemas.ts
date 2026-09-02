import { z } from "zod";

const identificationSchema = z
  .object({
    type: z.enum(["CPF", "CNPJ"]),
    number: z.string().transform((value) => value.replace(/\D/g, "")),
  })
  .transform((value, context) => {
    if (
      (value.type === "CPF" && value.number.length !== 11) ||
      (value.type === "CNPJ" && value.number.length !== 14)
    ) {
      context.addIssue({ code: "custom", message: "Documento inválido." });
      return z.NEVER;
    }
    return value;
  });

export const paymentCheckoutSchema = z
  .object({
    attemptId: z.string().uuid(),
    selectedPaymentMethod: z
      .enum(["bank_transfer", "creditCard", "credit_card"])
      .transform((value) => (value === "credit_card" ? "creditCard" : value)),
    formData: z.object({
      payment_method_id: z.string().trim().min(2).max(40),
      payment_type_id: z.string().trim().max(40).optional(),
      token: z
        .string()
        .trim()
        .min(16)
        .max(256)
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
      issuer_id: z.union([z.string(), z.number()]).optional(),
      installments: z.coerce.number().int().min(1).max(1).optional(),
      transaction_amount: z.coerce.number().finite().positive().optional(),
      payer: z
        .object({
          email: z.string().trim().email().optional(),
          identification: identificationSchema.optional(),
        })
        .optional(),
    }),
  })
  .superRefine((value, context) => {
    const pix = value.selectedPaymentMethod === "bank_transfer";
    if (pix && value.formData.payment_method_id !== "pix") {
      context.addIssue({
        code: "custom",
        path: ["formData", "payment_method_id"],
        message: "Meio Pix inválido.",
      });
    }
    if (!pix && !value.formData.token) {
      context.addIssue({
        code: "custom",
        path: ["formData", "token"],
        message: "Token do cartão ausente.",
      });
    }
  });

export type PaymentCheckoutInput = z.infer<typeof paymentCheckoutSchema>;
