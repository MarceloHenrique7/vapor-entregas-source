import "server-only";

interface Subscriber {
  userId: string;
  send: () => void;
}

const globalEvents = globalThis as typeof globalThis & {
  vaporEntregasNotificationSubscribers?: Set<Subscriber>;
};

const subscribers =
  globalEvents.vaporEntregasNotificationSubscribers ?? new Set<Subscriber>();
globalEvents.vaporEntregasNotificationSubscribers = subscribers;

export function publishNotificationChange(userIds: readonly string[]) {
  const recipients = new Set(userIds);
  for (const subscriber of subscribers) {
    if (recipients.has(subscriber.userId)) subscriber.send();
  }
}

export function subscribeToNotificationEvents(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
