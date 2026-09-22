import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import { getAuthEnv } from "@/server/config/env";

import { RegistrationRateLimitError } from "./errors";

const WINDOW_MS = 60 * 60 * 1_000;
const MAX_ATTEMPTS = 6;
const attempts = new Map<string, number[]>();

export function getRegistrationRateLimitKey(
  request: NextRequest,
  accountType: "COMPANY" | "MOTOBOY",
) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHmac("sha256", getAuthEnv().AUTH_RATE_LIMIT_SECRET)
    .update(`${accountType}:${address}`)
    .digest("hex");
}

export function enforceRegistrationRateLimit(key: string, now = Date.now()) {
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_ATTEMPTS) {
    throw new RegistrationRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(key, recent);
}
