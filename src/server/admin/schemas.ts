import { z } from "zod";

import { DELIVERY_STATUSES } from "@/server/deliveries/types";
import { REPORT_CATEGORIES, REPORT_STATUSES } from "@/server/reputation/types";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

export const adminIdSchema = z.string().uuid();

export const adminDashboardSearchSchema = z
  .object({
    period: z.enum(["today", "7d", "30d", "month", "custom"]).default("30d"),
    from: optionalDate,
    to: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.period === "custom" && (!value.from || !value.to)) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Informe o período personalizado completo.",
      });
    }
  });

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

export const companyProActionSchema = z
  .object({
    action: z.enum(["ENABLE", "EXTEND", "DISABLE"]),
    days: z.number().int().min(1).max(3650).optional(),
    indefinite: z.boolean().default(false),
    source: z
      .enum([
        "ADMIN_GRANTED",
        "PROMOTIONAL",
        "COMPENSATION",
        "EXTERNAL_PAYMENT",
        "PARTNER",
        "TEST",
      ])
      .optional(),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "ENABLE" && !value.source) {
      context.addIssue({
        code: "custom",
        path: ["source"],
        message: "Informe a origem da concessão.",
      });
    }
    if (
      (value.action === "ENABLE" || value.action === "EXTEND") &&
      !value.indefinite &&
      !value.days
    ) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Informe a duração do acesso.",
      });
    }
  });

export const motoboyPlanActionSchema = z
  .object({
    action: z.enum(["GRANT", "EXTEND", "REVOKE"]),
    planId: z.string().uuid().optional(),
    days: z.number().int().min(1).max(3650).optional(),
    reasonType: z
      .enum([
        "COURTESY",
        "TEST",
        "COMPENSATION",
        "EXTERNAL_PAYMENT",
        "SUPPORT",
        "OTHER",
      ])
      .optional(),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "GRANT" && !value.planId) {
      context.addIssue({
        code: "custom",
        path: ["planId"],
        message: "Selecione o plano.",
      });
    }
    if (value.action !== "REVOKE" && !value.days) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Informe a duração do acesso.",
      });
    }
    if (value.action === "GRANT" && !value.reasonType) {
      context.addIssue({
        code: "custom",
        path: ["reasonType"],
        message: "Informe o tipo do motivo.",
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
      "COMPANY_PRO_CHANGED",
      "MOTOBOY_PLAN_GRANTED",
      "MOTOBOY_PLAN_EXTENDED",
      "MOTOBOY_PLAN_REVOKED",
      "COMPANY_PRO_ENABLED",
      "COMPANY_PRO_EXTENDED",
      "COMPANY_PRO_DISABLED",
      "REVIEW_HIDDEN",
      "REVIEW_RESTORED",
      "REPORT_RESOLVED",
      "SETTING_CHANGED",
      "ADMIN_OVERRIDE",
    ])
    .optional(),
  page,
  pageSize,
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type DeliverySearchInput = z.infer<typeof deliverySearchSchema>;
export type ReportSearchInput = z.infer<typeof reportSearchSchema>;
export type AuditSearchInput = z.infer<typeof auditSearchSchema>;
