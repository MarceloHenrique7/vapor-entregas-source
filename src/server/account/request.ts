import { requireRole } from "@/server/auth/guards";
export async function requireAccountActor() {
  const user = await requireRole(["MOTOBOY", "COMPANY"]);
  return { userId: user.id, role: user.role } as const;
}
