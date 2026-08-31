import "server-only";

import { getPresenceEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { logServerError } from "@/server/observability/logger";

import { notificationIdSchema, notificationListSchema } from "./schemas";

export type NotificationType =
  | "NEW_OPPORTUNITY"
  | "DELIVERY_ACCEPTED"
  | "DELIVERY_STATUS_CHANGED"
  | "DELIVERY_CANCELLED"
  | "DELIVERY_COMPLETED"
  | "REPORT_UPDATED"
  | "ADMIN_NOTICE";

export async function listNotifications(userId: string, raw: unknown) {
  const input = notificationListSchema.parse(raw);
  const prisma = getPrisma();
  const where = { userId };
  const [items, total, unread] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items: items.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    page: input.page,
    pageSize: input.pageSize,
    total,
    unread,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function markNotificationRead(userId: string, rawId: unknown) {
  const id = notificationIdSchema.parse(rawId);
  const result = await getPrisma().notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    const owned = await getPrisma().notification.count({
      where: { id, userId },
    });
    if (owned === 0) return null;
  }
  return { id, readAt: new Date().toISOString() };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await getPrisma().notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

async function createForUsers(
  userIds: string[],
  input: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, string>;
  },
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;
  await getPrisma().notification.createMany({
    data: uniqueUserIds.map((userId) => ({ userId, ...input })),
  });
}

export async function notifyNewOpportunity(deliveryId: string) {
  const prisma = getPrisma();
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { pickupCity: true },
  });
  if (!delivery) return;
  const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
  const freshSince = new Date(
    Date.now() - ONLINE_PRESENCE_TTL_MINUTES * 60_000,
  );
  const recipients = await prisma.user.findMany({
    where: {
      role: "MOTOBOY",
      status: "ACTIVE",
      motoboyProfile: {
        city: delivery.pickupCity,
        isOnline: true,
        lastLocationAt: { gte: freshSince },
      },
    },
    select: { id: true },
  });
  await createForUsers(
    recipients.map(({ id }) => id),
    {
      type: "NEW_OPPORTUNITY",
      title: "Nova oportunidade disponível",
      message: "Há uma nova entrega disponível na sua cidade.",
      metadata: { deliveryId },
    },
  );
}

export async function notifyDeliveryEvent(
  deliveryId: string,
  event: "accepted" | "status" | "cancelled" | "completed",
) {
  const delivery = await getPrisma().delivery.findUnique({
    where: { id: deliveryId },
    select: {
      company: { select: { userId: true } },
      motoboy: { select: { userId: true } },
    },
  });
  if (!delivery) return;
  const copy = {
    accepted: {
      type: "DELIVERY_ACCEPTED" as const,
      title: "Corrida aceita",
      message: "A oportunidade foi aceita e já aparece na corrida atual.",
    },
    status: {
      type: "DELIVERY_STATUS_CHANGED" as const,
      title: "Status da entrega atualizado",
      message: "Uma etapa importante da entrega foi atualizada.",
    },
    cancelled: {
      type: "DELIVERY_CANCELLED" as const,
      title: "Entrega cancelada",
      message: "A entrega foi cancelada. Consulte o histórico para detalhes.",
    },
    completed: {
      type: "DELIVERY_COMPLETED" as const,
      title: "Entrega concluída",
      message: "A entrega foi concluída e já pode ser avaliada.",
    },
  }[event];
  await createForUsers(
    [delivery.company.userId, delivery.motoboy?.userId].filter(
      (id): id is string => Boolean(id),
    ),
    { ...copy, metadata: { deliveryId } },
  );
}

export async function notifyReportUpdate(reportId: string) {
  const report = await getPrisma().report.findUnique({
    where: { id: reportId },
    select: { reporterUserId: true },
  });
  if (!report) return;
  await createForUsers([report.reporterUserId], {
    type: "REPORT_UPDATED",
    title: "Denúncia atualizada",
    message:
      "Houve uma atualização na análise de uma denúncia enviada por você.",
    metadata: { reportId },
  });
}

export async function runNotificationTask(
  scope: string,
  task: () => Promise<void>,
) {
  try {
    await task();
  } catch (error) {
    logServerError(`notifications.${scope}`, error);
  }
}
