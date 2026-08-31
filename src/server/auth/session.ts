import "server-only";

import { cookies } from "next/headers";

import { getAuthEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";

import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "./session-constants";
import { createSessionToken, hashSessionToken } from "./session-token";
import { getSessionUserByToken } from "./session-lookup";
import type { SessionUser } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

export async function createSession(userId: string): Promise<void> {
  const { SESSION_TTL_DAYS } = getAuthEnv();
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * DAY_IN_MS);

  await getPrisma().session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(expiresAt),
  );
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return getSessionUserByToken(token);
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await getPrisma().session.updateMany({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
