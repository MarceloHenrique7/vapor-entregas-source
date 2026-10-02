import { z } from "zod";

import { ROLES } from "./types";

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(254);

export const loginEmailSchema = normalizedEmail;

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3).max(254).optional(),
    email: normalizedEmail.optional(),
    password: z.string().min(1).max(128),
  })
  .strict()
  .refine((data) => Boolean(data.identifier || data.email), {
    path: ["identifier"],
    message: "Informe seu WhatsApp ou e-mail.",
  });

export const passwordSchema = z
  .string()
  .min(12, "A senha deve ter pelo menos 12 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "Inclua pelo menos um número.");

export const roleSchema = z.enum(ROLES);

export const adminSeedEnvSchema = z.object({
  ADMIN_NAME: z.string().trim().min(3).max(120),
  ADMIN_EMAIL: normalizedEmail,
  ADMIN_PHONE: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{9,14}$/, "Use telefone no formato internacional."),
  ADMIN_PASSWORD: passwordSchema,
});

export type LoginInput = z.input<typeof loginSchema>;
