import type { Metadata } from "next";

import { CompanyHistoryList } from "@/components/company-history/company-history-list";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { ReputationOverview } from "@/components/reputation/reputation-overview";

export const metadata: Metadata = { title: "Histórico de entregas" };

export default function CompanyDeliveryHistoryPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Área da empresa"
        title="Histórico de entregas"
        description="Consulte todas as suas entregas, filtre no servidor e reutilize dados permitidos como um novo rascunho. Valores são apenas informativos."
      />
      <ReputationOverview />
      <CompanyHistoryList />
    </div>
  );
}
