import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { companyNavigation } from "@/components/dashboard/navigation";
import { requirePageRole } from "@/server/auth/page-guard";

export default async function CompanyAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePageRole(["COMPANY"]);
  return (
    <DashboardShell
      navigation={companyNavigation}
      user={user}
      roleLabel="Empresa"
    >
      {children}
    </DashboardShell>
  );
}
