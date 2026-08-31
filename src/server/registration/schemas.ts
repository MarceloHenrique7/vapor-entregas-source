import { z } from "zod";

import {
  getBrazilianDocumentType,
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-documents";
import { optionalVehiclePlateSchema } from "@/lib/validators/vehicle-plate";
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

const phoneSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine(
    (value) =>
      value.length === 10 ||
      value.length === 11 ||
      (value.startsWith("55") && (value.length === 12 || value.length === 13)),
    "Informe um telefone válido com DDD.",
  )
  .transform((value) => (value.startsWith("55") ? `+${value}` : `+55${value}`));

const confirmationFields = {
  termsAccepted: z.boolean().refine(Boolean, "Aceite os Termos de Uso."),
  privacyAccepted: z
    .boolean()
    .refine(Boolean, "Aceite a Política de Privacidade."),
};

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

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
    phone: phoneSchema,
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
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const companyRegistrationSchema = z
  .object({
    responsibleName: nameSchema,
    fantasyName: z.string().trim().min(2).max(120),
    legalDocument: z
      .string()
      .trim()
      .refine(
        (value) => getBrazilianDocumentType(value) !== null,
        "Informe um CPF ou CNPJ válido.",
      ),
    phone: phoneSchema,
    email: emailSchema,
    city: supportedCitySchema,
    address: z.string().trim().min(3).max(180),
    addressNumber: z.string().trim().min(1).max(20),
    neighborhood: z.string().trim().min(2).max(100),
    complement: optionalText(120),
    referencePoint: optionalText(180),
    password: passwordSchema,
    passwordConfirmation: z.string(),
    ...confirmationFields,
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export type MotoboyRegistrationInput = z.input<
  typeof motoboyRegistrationSchema
>;
export type CompanyRegistrationInput = z.input<
  typeof companyRegistrationSchema
>;
