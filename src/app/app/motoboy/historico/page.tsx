import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { DeliveryHistoryList } from "@/components/deliveries/delivery-history-list";
import { ReputationOverview } from "@/components/reputation/reputation-overview";

export const metadata: Metadata = { title: "Histórico de entregas" };

export default function MotoboyDeliveryHistoryPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Área do motoboy"
        title="Histórico de entregas"
        description="Consulte entregas concluídas e canceladas. Esta página não é um extrato financeiro."
      />
      <ReputationOverview />
      <DeliveryHistoryList actorRole="MOTOBOY" />
    </div>
  );
}
