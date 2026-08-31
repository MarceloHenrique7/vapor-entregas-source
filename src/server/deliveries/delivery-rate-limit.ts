import { DeliveryRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const limits = {
  create: 10,
  accept: 20,
  transition: 30,
  cancel: 10,
  extra: 20,
  quote: 30,
} as const;
const attempts = new Map<string, number[]>();

export function enforceDeliveryRateLimit(
  userId: string,
  action: keyof typeof limits,
  now = Date.now(),
) {
  const key = `${action}:${userId}`;
  const recent = (attempts.get(key) ?? []).filter(
    (time) => now - time < WINDOW_MS,
  );
  if (recent.length >= limits[action]) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000),
    );
    throw new DeliveryRateLimitError(retryAfterSeconds);
  }
  recent.push(now);
  attempts.set(key, recent);
}
