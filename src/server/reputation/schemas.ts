import { z } from "zod";

import { REPORT_CATEGORIES } from "./types";

const optionalComment = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value.includes("\0"), "Comentário inválido.")
  .transform((value) => value || undefined)
  .optional();

export const createRatingSchema = z
  .object({
    deliveryId: z.string().uuid(),
    score: z.coerce.number().int().min(1).max(5),
    comment: optionalComment,
  })
  .strict();

export const createFavoriteSchema = z
  .object({ deliveryId: z.string().uuid() })
  .strict();
export const favoriteIdSchema = z.string().uuid();

export const createReportSchema = z
  .object({
    deliveryId: z.string().uuid(),
    category: z.enum(REPORT_CATEGORIES),
    description: z
      .string()
      .trim()
      .min(20)
      .max(1500)
      .refine((value) => !value.includes("\0"), "Descrição inválida."),
  })
  .strict();

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
