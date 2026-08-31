import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import { getAuthEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const RATE_LIMIT_BLOCK_MS = 15 * 60 * 1_000;
const MAX_IP_FAILURES = 10;

interface ThrottleState {
  failedAttempts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
}

export function nextThrottleState(
  current: ThrottleState | null,
  now: Date,
): ThrottleState {
  const windowExpired =
    !current ||
    now.getTime() - current.windowStartedAt.getTime() >= RATE_LIMIT_WINDOW_MS;
  const failedAttempts = windowExpired ? 1 : current.failedAttempts + 1;

  return {
    failedAttempts,
    windowStartedAt: windowExpired ? now : current.windowStartedAt,
    blockedUntil:
      failedAttempts >= MAX_IP_FAILURES
        ? new Date(now.getTime() + RATE_LIMIT_BLOCK_MS)
        : (current?.blockedUntil ?? null),
  };
}

export function getLoginThrottleKey(request: NextRequest): string {
  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const address =
    forwardedAddress || request.headers.get("x-real-ip") || "unknown";
  const { AUTH_RATE_LIMIT_SECRET } = getAuthEnv();

  return createHmac("sha256", AUTH_RATE_LIMIT_SECRET)
    .update(address)
    .digest("hex");
}

export async function isLoginThrottled(
  keyHash: string,
  now = new Date(),
): Promise<boolean> {
  const throttle = await getPrisma().authThrottle.findUnique({
    where: { keyHash },
    select: { blockedUntil: true },
  });

  return Boolean(throttle?.blockedUntil && throttle.blockedUntil > now);
}

export async function recordLoginThrottleFailure(
  keyHash: string,
  now = new Date(),
): Promise<void> {
  const prisma = getPrisma();
  const current = await prisma.authThrottle.findUnique({
    where: { keyHash },
    select: {
      failedAttempts: true,
      windowStartedAt: true,
      blockedUntil: true,
    },
  });
  const next = nextThrottleState(current, now);

  await prisma.authThrottle.upsert({
    where: { keyHash },
    create: { keyHash, ...next },
    update: next,
  });
}

export async function clearLoginThrottle(keyHash: string): Promise<void> {
  await getPrisma().authThrottle.deleteMany({ where: { keyHash } });
}
