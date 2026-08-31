import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { adminNavigation } from "@/components/dashboard/navigation";
import { requirePageRole } from "@/server/auth/page-guard";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePageRole(["ADMIN"]);
  return (
    <DashboardShell
      navigation={adminNavigation}
      user={user}
      roleLabel="Administração"
    >
      {children}
    </DashboardShell>
  );
}
