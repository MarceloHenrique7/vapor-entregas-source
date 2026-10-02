import { z } from "zod";

import { normalizeBrazilPhone } from "@/lib/validators/phone";
import { editableVehiclePlateSchema } from "@/lib/validators/vehicle-plate";
import { passwordSchema } from "@/server/auth/schemas";

const nameSchema = z.string().trim().min(3).max(120);
const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform(normalizeBrazilPhone)
  .refine(
    (value): value is string => value !== null,
    "Informe um WhatsApp válido.",
  );
const currentPassword = z.string().min(1).max(128);

export const updateAccountSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    fantasyName: z.string().trim().min(2).max(120).optional(),
    vehiclePlate: editableVehiclePlateSchema,
    currentPassword,
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword,
    newPassword: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "As senhas não coincidem.",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "A nova senha deve ser diferente da atual.",
  });
export const exportAccountSchema = z.object({ currentPassword }).strict();
export const closeAccountSchema = z
  .object({ currentPassword, confirmation: z.literal("ENCERRAR MINHA CONTA") })
  .strict();

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
