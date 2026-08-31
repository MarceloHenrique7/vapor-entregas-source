import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import { getAuthEnv } from "@/server/config/env";

import { PreRegistrationRateLimitError } from "./errors";

const WINDOW_MS = 60 * 60 * 1_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, number[]>();

export function getPreRegistrationRateLimitKey(request: NextRequest) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHmac("sha256", getAuthEnv().AUTH_RATE_LIMIT_SECRET)
    .update(address)
    .digest("hex");
}

export function enforcePreRegistrationRateLimit(key: string, now = Date.now()) {
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000),
    );
    throw new PreRegistrationRateLimitError(retryAfterSeconds);
  }
  recent.push(now);
  attempts.set(key, recent);
}
