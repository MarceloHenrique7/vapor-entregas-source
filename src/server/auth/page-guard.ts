import "server-only";

import { redirect } from "next/navigation";

import { getCurrentSessionUser } from "./session";
import type { Role } from "./types";

export async function requirePageRole(allowedRoles: readonly Role[]) {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/?auth=required");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect("/?auth=forbidden");
  }

  return user;
}
