import { SubscriptionRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 10;
const MAX_STATUS_POLLS = 20;
const actionAttempts = new Map<string, number[]>();
const statusPollAttempts = new Map<string, number[]>();

function enforceLimit(
  attempts: Map<string, number[]>,
  userId: string,
  limit: number,
  now: number,
) {
  const recent = (attempts.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= limit) {
    throw new SubscriptionRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(userId, recent);
}

export function enforceSubscriptionRateLimit(userId: string, now = Date.now()) {
  enforceLimit(actionAttempts, userId, MAX_ACTIONS, now);
}

export function enforceSubscriptionStatusRateLimit(
  userId: string,
  now = Date.now(),
) {
  enforceLimit(statusPollAttempts, userId, MAX_STATUS_POLLS, now);
}
