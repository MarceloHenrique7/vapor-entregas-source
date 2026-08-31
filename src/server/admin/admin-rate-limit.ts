import { AdminRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 30;
const attempts = new Map<string, number[]>();

export function enforceAdminRateLimit(adminUserId: string, now = Date.now()) {
  const recent = (attempts.get(adminUserId) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_ACTIONS) {
    throw new AdminRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)),
    );
  }
  recent.push(now);
  attempts.set(adminUserId, recent);
}
