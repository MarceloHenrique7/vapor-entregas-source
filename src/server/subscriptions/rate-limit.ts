import { SubscriptionRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 10;
const attempts = new Map<string, number[]>();

export function enforceSubscriptionRateLimit(userId: string, now = Date.now()) {
  const recent = (attempts.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_ACTIONS) {
    throw new SubscriptionRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(userId, recent);
}
