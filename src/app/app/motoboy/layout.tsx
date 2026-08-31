import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { motoboyNavigation } from "@/components/dashboard/navigation";
import { MotoboyPresenceProvider } from "@/components/presence/motoboy-presence-provider";
import { requirePageRole } from "@/server/auth/page-guard";

export default async function MotoboyAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePageRole(["MOTOBOY"]);
  return (
    <MotoboyPresenceProvider>
      <DashboardShell
        navigation={motoboyNavigation}
        user={user}
        roleLabel="Motoboy"
      >
        {children}
      </DashboardShell>
    </MotoboyPresenceProvider>
  );
}
