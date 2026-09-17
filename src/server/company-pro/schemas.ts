import { z } from "zod";

export const companyProPeriodSchema = z
  .object({
    period: z
      .enum(["today", "7d", "30d", "current_month", "previous_month", "custom"])
      .default("30d"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.period === "custom" && (!value.from || !value.to)) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Informe o início e o fim do período.",
      });
      return;
    }
    if (value.from && value.to) {
      const from = new Date(`${value.from}T03:00:00.000Z`);
      const to = new Date(`${value.to}T03:00:00.000Z`);
      const days = (to.getTime() - from.getTime()) / 86_400_000;
      if (days < 0 || days > 366) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message: "Use um período de até 366 dias.",
        });
      }
    }
  });

export type CompanyProPeriodInput = z.infer<typeof companyProPeriodSchema>;
