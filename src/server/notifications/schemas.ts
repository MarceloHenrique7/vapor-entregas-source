import { z } from "zod";

export const notificationListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationIdSchema = z.string().uuid();

const trustedPushHosts = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
] as const;

export function isTrustedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (trustedPushHosts.includes(
        url.hostname as (typeof trustedPushHosts)[number],
      ) ||
        url.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

const pushEndpoint = z
  .string()
  .trim()
  .url()
  .max(512)
  .refine(isTrustedPushEndpoint, "Endpoint de push não permitido.");
const pushKey = z
  .string()
  .trim()
  .min(16)
  .max(255)
  .regex(/^[A-Za-z0-9_-]+$/, "Chave de push inválida.");

export const pushSubscriptionSchema = z
  .object({
    endpoint: pushEndpoint,
    expirationTime: z.number().finite().positive().nullable().optional(),
    keys: z.object({
      p256dh: pushKey,
      auth: pushKey,
    }),
  })
  .strict();

export const removePushSubscriptionSchema = z
  .object({ endpoint: pushEndpoint })
  .strict();
