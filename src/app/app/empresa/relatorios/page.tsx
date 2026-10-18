import type { Metadata } from "next";

import { CompanyReportsDashboard } from "@/components/company-reports/company-reports-dashboard";

export const metadata: Metadata = { title: "Relatórios" };

export default function CompanyReportsPage() {
  return <CompanyReportsDashboard />;
}
