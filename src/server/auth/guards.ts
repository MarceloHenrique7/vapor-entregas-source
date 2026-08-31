import "server-only";

import { assertRole } from "./authorization";
import { UnauthenticatedError } from "./errors";
import { getCurrentSessionUser } from "./session";
import type { Role, SessionUser } from "./types";

export async function requireAuthenticatedUser(): Promise<SessionUser> {
  const user = await getCurrentSessionUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  return user;
}

export async function requireRole(
  allowedRoles: readonly Role[],
): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  assertRole(user, allowedRoles);
  return user;
}
