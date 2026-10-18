import { IntegrationRateLimitError } from "./errors";

const attempts = new Map<string, number[]>();

export function enforceIntegrationRateLimit(
  key: string,
  limit = 60,
  now = Date.now(),
) {
  const windowMs = 60_000;
  const recent = (attempts.get(key) ?? []).filter(
    (time) => now - time < windowMs,
  );
  if (recent.length >= limit) {
    throw new IntegrationRateLimitError(
      Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(key, recent);
}
