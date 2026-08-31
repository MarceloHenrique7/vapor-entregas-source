import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { DeliveryExtraRepository } from "./delivery-extra-service";

const operationalStatuses = [
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
] as const;

const extraSelect = {
  id: true,
  type: true,
  description: true,
  amount: true,
  informedByRole: true,
  status: true,
  note: true,
  createdAt: true,
  history: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      previousStatus: true,
      newStatus: true,
      action: true,
      actorRole: true,
      note: true,
      createdAt: true,
    },
  },
} as const;

function mapView(extra: {
  id: string;
  type:
    | "WAITING"
    | "RETURN"
    | "PURCHASE"
    | "SPECIAL_WEIGHT_VOLUME"
    | "CANCELLATION_AFTER_DEPARTURE"
    | "OTHER";
  description: string;
  amount: { toNumber(): number } | null;
  informedByRole: "COMPANY" | "MOTOBOY" | "ADMIN";
  status: "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
  note: string | null;
  createdAt: Date;
  history: Array<{
    id: string;
    previousStatus:
      "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED" | null;
    newStatus: "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
    action: "CREATED" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
    actorRole: "COMPANY" | "MOTOBOY" | "ADMIN";
    note: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    ...extra,
    amount: extra.amount?.toNumber() ?? null,
    createdAt: extra.createdAt.toISOString(),
    history: extra.history.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export const prismaDeliveryExtraRepository: DeliveryExtraRepository = {
  async addExtra(userId, role, deliveryId, input, now) {
    return getPrisma().$transaction(async (transaction) => {
      const delivery = await transaction.delivery.findUnique({
        where: { id: deliveryId },
        select: {
          company: { select: { userId: true } },
          motoboy: { select: { userId: true } },
          status: true,
        },
      });
      if (!delivery) return { kind: "not_found" } as const;
      const owns =
        role === "COMPANY"
          ? delivery.company.userId === userId
          : delivery.motoboy?.userId === userId;
      if (!owns) return { kind: "forbidden" } as const;
      if (
        !operationalStatuses.includes(
          delivery.status as (typeof operationalStatuses)[number],
        )
      )
        return { kind: "conflict" } as const;
      const extra = await transaction.deliveryExtra.create({
        data: {
          deliveryId,
          ...input,
          informedByUserId: userId,
          informedByRole: role,
          status: "PENDING",
          createdAt: now,
          history: {
            create: {
              previousStatus: null,
              newStatus: "PENDING",
              action: "CREATED",
              actorUserId: userId,
              actorRole: role,
              note: "Adicional informado durante a entrega.",
              createdAt: now,
            },
          },
        },
        select: extraSelect,
      });
      return { kind: "updated", extra: mapView(extra) } as const;
    });
  },

  async respondToExtra(userId, role, deliveryId, extraId, input, now) {
    return getPrisma().$transaction(async (transaction) => {
      const extra = await transaction.deliveryExtra.findFirst({
        where: { id: extraId, deliveryId },
        select: {
          id: true,
          status: true,
          informedByUserId: true,
          delivery: {
            select: {
              company: { select: { userId: true } },
              motoboy: { select: { userId: true } },
              status: true,
            },
          },
        },
      });
      if (!extra) return { kind: "not_found" } as const;
      const owns =
        role === "COMPANY"
          ? extra.delivery.company.userId === userId
          : extra.delivery.motoboy?.userId === userId;
      if (!owns || extra.informedByUserId === userId)
        return { kind: "forbidden" } as const;
      if (
        extra.status !== "PENDING" ||
        !operationalStatuses.includes(
          extra.delivery.status as (typeof operationalStatuses)[number],
        )
      )
        return { kind: "conflict" } as const;
      const updated = await transaction.deliveryExtra.updateMany({
        where: { id: extraId, status: "PENDING" },
        data: { status: input.decision },
      });
      if (updated.count !== 1) return { kind: "conflict" } as const;
      await transaction.deliveryExtraHistory.create({
        data: {
          extraId,
          previousStatus: "PENDING",
          newStatus: input.decision,
          action: input.decision,
          actorUserId: userId,
          actorRole: role,
          note: input.note,
          createdAt: now,
        },
      });
      const persisted = await transaction.deliveryExtra.findUniqueOrThrow({
        where: { id: extraId },
        select: extraSelect,
      });
      return { kind: "updated", extra: mapView(persisted) } as const;
    });
  },
};
