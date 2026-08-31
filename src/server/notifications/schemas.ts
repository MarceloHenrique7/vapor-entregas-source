import { z } from "zod";

export const notificationListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationIdSchema = z.string().uuid();
