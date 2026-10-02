import { z } from "zod";

import { isValidCpf } from "@/lib/validators/br-documents";
import { optionalVehiclePlateSchema } from "@/lib/validators/vehicle-plate";
import { normalizeBrazilPhone } from "@/lib/validators/phone";
import { passwordSchema } from "@/server/auth/schemas";

export const supportedCitySchema = z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]);

const nameSchema = z
  .string()
  .trim()
  .min(3, "Informe o nome completo.")
  .max(120)
  .refine(
    (value) => value.split(/\s+/).length >= 2,
    "Informe nome e sobrenome.",
  );

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registrationPhoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform(normalizeBrazilPhone)
  .refine(
    (value): value is string => value !== null,
    "Informe um WhatsApp válido.",
  );

const confirmationFields = {
  termsAccepted: z.boolean().refine(Boolean, "Aceite os Termos de Uso."),
  privacyAccepted: z
    .boolean()
    .refine(Boolean, "Aceite a Política de Privacidade."),
};

export const motoboyRegistrationSchema = z
  .object({
    name: nameSchema,
    cpf: z.string().trim().refine(isValidCpf, "Informe um CPF válido."),
    rg: z
      .string()
      .trim()
      .min(4, "Informe o número do RG.")
      .max(20)
      .regex(/^[0-9A-Za-z.\-/\s]+$/, "Formato de RG inválido."),
    phone: registrationPhoneSchema,
    email: emailSchema,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date < new Date();
      }, "Informe uma data de nascimento válida."),
    city: supportedCitySchema,
    vehiclePlate: optionalVehiclePlateSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    ...confirmationFields,
    legalResponsibilityAccepted: z
      .boolean()
      .refine(Boolean, "Confirme sua responsabilidade legal."),
    intermediationAccepted: z
      .boolean()
      .refine(Boolean, "Confirme o papel tecnológico da plataforma."),
  })
  .strict()
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const companyRegistrationSchema = z
  .object({
    fantasyName: z
      .string()
      .trim()
      .min(2, "Informe o nome da empresa.")
      .max(120),
    phone: registrationPhoneSchema,
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
  })
  .strict();

export type MotoboyRegistrationInput = z.input<
  typeof motoboyRegistrationSchema
>;
export type CompanyRegistrationInput = z.input<
  typeof companyRegistrationSchema
>;
