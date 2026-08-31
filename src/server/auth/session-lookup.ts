import "server-only";

import { getPrisma } from "@/server/db/prisma";

import { hashSessionToken } from "./session-token";
import type { SessionUser } from "./types";

export async function getSessionUserByToken(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  const now = new Date();
  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          passwordChangedAt: true,
        },
      },
    },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== "ACTIVE" ||
    session.createdAt < session.user.passwordChangedAt
  ) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status,
  };
}
