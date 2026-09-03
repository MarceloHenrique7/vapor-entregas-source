import "server-only";

import { getPresenceEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { logServerError } from "@/server/observability/logger";

import { publishNotificationChange } from "./notification-events";
import { notificationIdSchema, notificationListSchema } from "./schemas";

export type NotificationType =
  | "NEW_OPPORTUNITY"
  | "DELIVERY_ACCEPTED"
  | "DELIVERY_STATUS_CHANGED"
  | "DELIVERY_CANCELLED"
  | "DELIVERY_COMPLETED"
  | "REPORT_UPDATED"
  | "PLAN_PAYMENT_APPROVED"
  | "PLAN_EXPIRING"
  | "PLAN_EXPIRED"
  | "ADMIN_NOTICE";

function rolePath(role: "COMPANY" | "MOTOBOY" | "ADMIN", section: string) {
  const base =
    role === "COMPANY"
      ? "/app/empresa"
      : role === "MOTOBOY"
        ? "/app/motoboy"
        : "/admin";
  return `${base}/${section}`;
}

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
  publishNotificationChange([userId]);
  return { id, readAt: new Date().toISOString() };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await getPrisma().notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count > 0) publishNotificationChange([userId]);
  return { updated: result.count };
}

async function createForUsers(
  userIds: string[],
  input: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, string>;
    eventKey: string;
  },
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;
  const result = await getPrisma().notification.createMany({
    data: uniqueUserIds.map((userId) => ({ userId, ...input })),
    skipDuplicates: true,
  });
  if (result.count > 0) publishNotificationChange(uniqueUserIds);
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
      metadata: {
        deliveryId,
        targetUrl: "/app/motoboy/oportunidades",
      },
      eventKey: `opportunity-created:${deliveryId}`,
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
      status: true,
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
  const eventKey = `delivery:${deliveryId}:${event}:${delivery.status}`;
  await createForUsers([delivery.company.userId], {
    ...copy,
    metadata: {
      deliveryId,
      targetUrl: `/app/empresa/entregas/${deliveryId}`,
    },
    eventKey,
  });
  if (delivery.motoboy?.userId) {
    await createForUsers([delivery.motoboy.userId], {
      ...copy,
      metadata: { deliveryId, targetUrl: "/app/motoboy/corrida" },
      eventKey,
    });
  }
}

export async function notifyReportUpdate(reportId: string) {
  const report = await getPrisma().report.findUnique({
    where: { id: reportId },
    select: {
      reporterUserId: true,
      status: true,
      reporter: { select: { role: true } },
    },
  });
  if (!report) return;
  await createForUsers([report.reporterUserId], {
    type: "REPORT_UPDATED",
    title: "Denúncia atualizada",
    message:
      "Houve uma atualização na análise de uma denúncia enviada por você.",
    metadata: {
      reportId,
      targetUrl: rolePath(report.reporter.role, "denuncias"),
    },
    eventKey: `report:${reportId}:${report.status}`,
  });
}

export async function notifyPlanPaymentApproved(input: {
  userId: string;
  paymentId: string;
}) {
  const user = await getPrisma().user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });
  if (!user) return;
  await createForUsers([input.userId], {
    type: "PLAN_PAYMENT_APPROVED",
    title: "Pagamento aprovado",
    message: "Seu acesso ao plano foi liberado por mais 30 dias.",
    metadata: {
      paymentId: input.paymentId,
      targetUrl: rolePath(user.role, "assinatura"),
    },
    eventKey: `payment-approved:${input.paymentId}`,
  });
}

export async function syncPlanLifecycleNotifications(
  userId: string,
  now = new Date(),
) {
  const subscription = await getPrisma().subscription.findFirst({
    where: { userId },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
      plan: { select: { role: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!subscription?.currentPeriodEnd) return;
  const end = subscription.currentPeriodEnd;
  const endKey = end.toISOString();
  if (end.getTime() <= now.getTime()) {
    await createForUsers([userId], {
      type: "PLAN_EXPIRED",
      title: "Acesso ao plano expirado",
      message: "Renove o plano para voltar a usar as funções operacionais.",
      metadata: {
        subscriptionId: subscription.id,
        targetUrl: rolePath(subscription.plan.role, "assinatura"),
      },
      eventKey: `plan-expired:${subscription.id}:${endKey}`,
    });
    return;
  }
  const remainingMs = end.getTime() - now.getTime();
  if (
    remainingMs <= 3 * 24 * 60 * 60 * 1000 &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIAL")
  ) {
    await createForUsers([userId], {
      type: "PLAN_EXPIRING",
      title: "Seu acesso vence em breve",
      message:
        "Renove o plano para manter o acesso operacional sem interrupção.",
      metadata: {
        subscriptionId: subscription.id,
        targetUrl: rolePath(subscription.plan.role, "assinatura"),
      },
      eventKey: `plan-expiring:${subscription.id}:${endKey}`,
    });
  }
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
