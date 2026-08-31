import { z } from "zod";

import { DELIVERY_STATUSES } from "@/server/deliveries/types";

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
};

const optionalSearch = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value || undefined)
  .optional();

export const companyHistoryQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(DELIVERY_STATUSES).optional(),
    motoboyId: z.string().uuid().optional(),
    city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]).optional(),
    query: optionalSearch,
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: "O período inicial deve ser anterior ao final.",
    path: ["to"],
  });

export const companyMotoboysQuerySchema = z.object({
  ...pageFields,
  query: optionalSearch,
  favoritesOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .or(z.boolean())
    .default(false),
});

export const companyRelationQuerySchema = z.object({
  ...pageFields,
  status: z.enum(DELIVERY_STATUSES).optional(),
});

export const companyHistoryIdSchema = z.string().uuid();

export type CompanyHistoryQuery = z.infer<typeof companyHistoryQuerySchema>;
export type CompanyMotoboysQuery = z.infer<typeof companyMotoboysQuerySchema>;
export type CompanyRelationQuery = z.infer<typeof companyRelationQuerySchema>;
