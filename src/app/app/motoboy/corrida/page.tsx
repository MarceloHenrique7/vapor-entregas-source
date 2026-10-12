import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { CurrentDeliveryCard } from "@/components/deliveries/current-delivery-card";

export const metadata: Metadata = { title: "Corrida atual" };

export default function CurrentDeliveryPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Em andamento"
        title="Corrida atual"
        description="Siga a próxima etapa e abra a rota quando precisar."
      />
      <CurrentDeliveryCard />
    </div>
  );
}
