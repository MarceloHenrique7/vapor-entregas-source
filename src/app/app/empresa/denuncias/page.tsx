import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { ReportsList } from "@/components/reputation/reports-list";

export const metadata: Metadata = { title: "Minhas denúncias" };

export default function CompanyReportsPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Suporte e segurança"
        title="Minhas denúncias"
        description="Consulte somente as denúncias abertas por sua empresa. A moderação completa pertence à Etapa 9."
      />
      <ReportsList />
    </div>
  );
}
