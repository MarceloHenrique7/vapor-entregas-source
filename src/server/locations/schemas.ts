import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

const postalCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (value) => value === "" || value.length === 8,
    "Informe um CEP válido.",
  )
  .transform((value) => value || undefined)
  .optional();

const locationAddressObjectSchema = z.object({
  label: z.string().trim().min(2).max(80).default("Loja principal"),
  address: z.string().trim().min(3).max(180),
  number: z.string().trim().min(1).max(20),
  neighborhood: z.string().trim().min(2).max(100),
  complement: optionalText(120),
  reference: optionalText(180),
  city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]),
  state: z.enum(["PE", "BA"]),
  postalCode: postalCodeSchema,
});

const cityMatchesState = (data: { city: string; state: string }) =>
  (data.city === "PETROLINA_PE" && data.state === "PE") ||
  (data.city === "JUAZEIRO_BA" && data.state === "BA");

export const locationAddressSchema = locationAddressObjectSchema.refine(
  cityMatchesState,
  { message: "A cidade e o estado não correspondem.", path: ["state"] },
);

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const saveCompanyLocationSchema =
  locationAddressSchema.and(coordinatesSchema);

export const geocodingQuerySchema = locationAddressObjectSchema
  .pick({
    address: true,
    number: true,
    neighborhood: true,
    city: true,
    state: true,
    postalCode: true,
  })
  .refine(cityMatchesState, {
    message: "A cidade e o estado não correspondem.",
    path: ["state"],
  });

export const geocodingSuggestionSchema = z.object({
  query: z.string().trim().min(3).max(200),
  city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]),
});

export type SaveCompanyLocationInput = z.infer<
  typeof saveCompanyLocationSchema
>;
export type GeocodingQuery = z.infer<typeof geocodingQuerySchema>;
export type GeocodingSuggestionQuery = z.infer<
  typeof geocodingSuggestionSchema
>;
