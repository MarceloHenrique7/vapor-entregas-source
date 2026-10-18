import { z } from "zod";

import { DELIVERY_STATUSES } from "@/server/deliveries/types";

export const companyReportFilterSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    status: z.enum(DELIVERY_STATUSES).optional(),
    motoboyId: z.uuid().optional(),
    channel: z
      .enum(["VAPOR", "GENERIC_WEBHOOK", "MANUAL_CSV", "IFOOD"])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
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

export type CompanyReportFilter = z.infer<typeof companyReportFilterSchema>;
