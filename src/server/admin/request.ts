import { requireRole } from "@/server/auth/guards";
import type { AdminActor } from "./types";

export async function requireAdminActor(): Promise<AdminActor> {
  const user = await requireRole(["ADMIN"]);
  return { userId: user.id, role: user.role, status: user.status };
}

export function searchParamsObject(params: URLSearchParams) {
  return Object.fromEntries(
    [...params.entries()].filter(([, value]) => value !== ""),
  );
}
