import { createHash } from "node:crypto";

import { TrackingRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const LIMITS = { manage: 20, location: 12, publicRead: 120 } as const;
const attempts = new Map<string, number[]>();

function enforce(key: string, limit: number, now: number) {
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= limit) {
    throw new TrackingRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(key, recent);
}

export function enforceTrackingActorRateLimit(
  userId: string,
  action: "manage" | "location",
  now = Date.now(),
) {
  enforce(`${action}:${userId}`, LIMITS[action], now);
}

export function enforcePublicTrackingRateLimit(
  clientAddress: string,
  now = Date.now(),
) {
  const fingerprint = createHash("sha256").update(clientAddress).digest("hex");
  enforce(`public:${fingerprint}`, LIMITS.publicRead, now);
}
