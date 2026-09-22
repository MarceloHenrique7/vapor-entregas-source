import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  companyNavigation,
  prelaunchCompanyNavigation,
} from "@/components/dashboard/navigation";
import { requirePageRole } from "@/server/auth/page-guard";
import { getPrelaunchEnv } from "@/server/config/env";
import { canBypassPrelaunch } from "@/server/prelaunch/policy";

export default async function CompanyAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePageRole(["COMPANY"]);
  const prelaunch = getPrelaunchEnv();
  const restricted =
    prelaunch.enabled && !canBypassPrelaunch(user, prelaunch.testUserIds);
  return (
    <DashboardShell
      navigation={restricted ? prelaunchCompanyNavigation : companyNavigation}
      user={user}
      roleLabel="Empresa"
    >
      {children}
    </DashboardShell>
  );
}
