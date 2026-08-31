import { z } from "zod";

import { DELIVERY_STATUSES } from "@/server/deliveries/types";
import { REPORT_CATEGORIES, REPORT_STATUSES } from "@/server/reputation/types";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

export const adminIdSchema = z.string().uuid();

export const userSearchSchema = z
  .object({
    query: z.string().trim().max(254).default(""),
    role: z.enum(["MOTOBOY", "COMPANY", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED", "DELETED"]).optional(),
    city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]).optional(),
    page,
    pageSize,
  })
  .strict();

export const userStatusActionSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine(({ status, reason }, context) => {
    if (status !== "ACTIVE" && (!reason || reason.length < 10)) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Informe um motivo com pelo menos 10 caracteres.",
      });
    }
  });

export const deliverySearchSchema = z.object({
  status: z.enum(DELIVERY_STATUSES).optional(),
  city: z.enum(["PETROLINA_PE", "JUAZEIRO_BA"]).optional(),
  company: z.string().trim().max(120).optional(),
  motoboy: z.string().trim().max(120).optional(),
  deliveryId: z.union([z.literal(""), z.string().uuid()]).optional(),
  from: optionalDate,
  to: optionalDate,
  page,
  pageSize,
});

export const reportSearchSchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  category: z.enum(REPORT_CATEGORIES).optional(),
  from: optionalDate,
  to: optionalDate,
  page,
  pageSize,
});

export const reportStatusActionSchema = z
  .object({
    status: z.enum(REPORT_STATUSES),
    reason: z.string().trim().min(5).max(1000),
    adminNotes: z
      .string()
      .trim()
      .max(2000)
      .transform((value) => value || undefined)
      .optional(),
  })
  .strict();

export const auditSearchSchema = z.object({
  actionType: z
    .enum([
      "USER_ACTIVATED",
      "USER_SUSPENDED",
      "USER_BANNED",
      "USER_REACTIVATED",
      "REPORT_STATUS_CHANGED",
      "PRICING_RULE_CHANGED",
      "SUBSCRIPTION_PLAN_CHANGED",
    ])
    .optional(),
  page,
  pageSize,
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type DeliverySearchInput = z.infer<typeof deliverySearchSchema>;
export type ReportSearchInput = z.infer<typeof reportSearchSchema>;
export type AuditSearchInput = z.infer<typeof auditSearchSchema>;
