import "server-only";

import { getPrisma } from "@/server/db/prisma";

export type DeliveryEventType =
  | "nova_corrida"
  | "corrida_aceita"
  | "status_alterado"
  | "corrida_cancelada"
  | "adicional_alterado";

interface DeliveryEvent {
  type: DeliveryEventType;
  deliveryId: string;
  audience:
    | { kind: "motoboys" }
    | { kind: "company"; profileId: string }
    | { kind: "motoboy"; profileId: string };
}

interface Subscriber {
  role: "COMPANY" | "MOTOBOY";
  profileId: string;
  send: (event: Omit<DeliveryEvent, "audience">) => void;
}

const globalEvents = globalThis as typeof globalThis & {
  vaporEntregasDeliverySubscribers?: Set<Subscriber>;
};

const subscribers =
  globalEvents.vaporEntregasDeliverySubscribers ?? new Set<Subscriber>();
globalEvents.vaporEntregasDeliverySubscribers = subscribers;

function canReceive(subscriber: Subscriber, event: DeliveryEvent) {
  if (event.audience.kind === "motoboys") return subscriber.role === "MOTOBOY";
  if (event.audience.kind === "company") {
    return (
      subscriber.role === "COMPANY" &&
      subscriber.profileId === event.audience.profileId
    );
  }
  return (
    subscriber.role === "MOTOBOY" &&
    subscriber.profileId === event.audience.profileId
  );
}

export function publishDeliveryEvent(event: DeliveryEvent) {
  for (const subscriber of subscribers) {
    if (canReceive(subscriber, event)) {
      subscriber.send({ type: event.type, deliveryId: event.deliveryId });
    }
  }
}

export function subscribeToDeliveryEvents(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function publishDeliveryChange(
  delivery: { id: string; companyId: string; motoboyId: string | null },
  type: "status_alterado" | "corrida_cancelada" | "adicional_alterado",
) {
  publishDeliveryEvent({
    type,
    deliveryId: delivery.id,
    audience: { kind: "company", profileId: delivery.companyId },
  });
  if (delivery.motoboyId) {
    publishDeliveryEvent({
      type,
      deliveryId: delivery.id,
      audience: { kind: "motoboy", profileId: delivery.motoboyId },
    });
  }
}

export async function publishDeliveryChangeById(
  deliveryId: string,
  type: "adicional_alterado",
) {
  const delivery = await getPrisma().delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, companyId: true, motoboyId: true },
  });
  if (delivery) publishDeliveryChange(delivery, type);
}
