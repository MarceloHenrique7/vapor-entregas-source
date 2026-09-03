import { LocationRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const attempts = new Map<string, number[]>();

export function enforceLocationRateLimit(userId: string, now = Date.now()) {
  const recent = (attempts.get(userId) ?? []).filter(
    (time) => now - time < WINDOW_MS,
  );
  if (recent.length >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000),
    );
    throw new LocationRateLimitError(retryAfterSeconds);
  }
  recent.push(now);
  attempts.set(userId, recent);
}
