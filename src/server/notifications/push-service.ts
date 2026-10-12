import "server-only";

import webPush from "web-push";

import { getWebPushEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { logServerError } from "@/server/observability/logger";

import {
  pushSubscriptionSchema,
  removePushSubscriptionSchema,
} from "./schemas";
import type { NotificationType } from "./types";

export interface WebPushPayload {
  type: NotificationType;
  title: string;
  message: string;
  path: string;
  tag?: string;
}

export function getWebPushConfiguration() {
  const config = getWebPushEnv();
  return config.enabled
    ? { enabled: true as const, publicKey: config.publicKey }
    : { enabled: false as const, publicKey: null };
}

export async function savePushSubscription(
  userId: string,
  raw: unknown,
  userAgent?: string | null,
) {
  const input = pushSubscriptionSchema.parse(raw);
  const expirationTime = input.expirationTime
    ? new Date(input.expirationTime)
    : null;
  await getPrisma().pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime,
      userAgent: userAgent?.slice(0, 255) || null,
    },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime,
      userAgent: userAgent?.slice(0, 255) || null,
    },
  });
  return { subscribed: true };
}

export async function removePushSubscription(userId: string, raw: unknown) {
  const input = removePushSubscriptionSchema.parse(raw);
  const result = await getPrisma().pushSubscription.deleteMany({
    where: { userId, endpoint: input.endpoint },
  });
  return { subscribed: false, removed: result.count };
}

function responseStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return null;
  }
  const status = (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? status : null;
}

export async function sendWebPushToUsers(
  userIds: readonly string[],
  payload: WebPushPayload,
) {
  const config = getWebPushEnv();
  if (!config.enabled || userIds.length === 0) {
    return { sent: 0, removed: 0 };
  }
  const subscriptions = await getPrisma().pushSubscription.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
          {
            TTL: payload.type === "NEW_OPPORTUNITY" ? 300 : 86_400,
            urgency: payload.type === "NEW_OPPORTUNITY" ? "high" : "normal",
            vapidDetails: {
              subject: config.subject,
              publicKey: config.publicKey,
              privateKey: config.privateKey,
            },
          },
        );
        sent += 1;
      } catch (error) {
        const status = responseStatus(error);
        if (status === 404 || status === 410) {
          await getPrisma().pushSubscription.delete({
            where: { id: subscription.id },
          });
          removed += 1;
          return;
        }
        logServerError(
          "notifications.web-push",
          new Error(
            status
              ? `O serviço Web Push respondeu com status ${status}.`
              : "Falha ao enviar Web Push.",
          ),
        );
      }
    }),
  );
  return { sent, removed };
}
