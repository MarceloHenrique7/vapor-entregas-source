import type { SessionUser } from "@/server/auth/types";

import type { PresenceRepository } from "./presence-service";

export async function endPresenceOnLogout(
  user: SessionUser | null,
  repository: PresenceRepository,
  now = new Date(),
) {
  if (user?.role !== "MOTOBOY") return;
  await repository.setOffline(user.id, now);
}
