import { AccountRateLimitError } from "./errors";
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();
export function enforceAccountRateLimit(
  userId: string,
  operation: string,
  now = Date.now(),
) {
  const key = `${userId}:${operation}`;
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_ATTEMPTS)
    throw new AccountRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)),
    );
  recent.push(now);
  attempts.set(key, recent);
}
