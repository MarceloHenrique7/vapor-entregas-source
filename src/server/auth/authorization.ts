import { ForbiddenError } from "./errors";
import type { Role, SessionUser } from "./types";

export function assertRole(
  user: SessionUser,
  allowedRoles: readonly Role[],
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }
}
