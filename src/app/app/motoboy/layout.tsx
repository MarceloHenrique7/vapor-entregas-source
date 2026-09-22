import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  motoboyNavigation,
  prelaunchMotoboyNavigation,
} from "@/components/dashboard/navigation";
import { MotoboyPresenceProvider } from "@/components/presence/motoboy-presence-provider";
import { requirePageRole } from "@/server/auth/page-guard";
import { getPrelaunchEnv } from "@/server/config/env";
import { canBypassPrelaunch } from "@/server/prelaunch/policy";

export default async function MotoboyAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePageRole(["MOTOBOY"]);
  const prelaunch = getPrelaunchEnv();
  const restricted =
    prelaunch.enabled && !canBypassPrelaunch(user, prelaunch.testUserIds);
  const shell = (
    <DashboardShell
      navigation={restricted ? prelaunchMotoboyNavigation : motoboyNavigation}
      user={user}
      roleLabel="Motoboy"
    >
      {children}
    </DashboardShell>
  );
  return restricted ? (
    shell
  ) : (
    <MotoboyPresenceProvider>{shell}</MotoboyPresenceProvider>
  );
}
