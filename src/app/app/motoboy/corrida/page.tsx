import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { CurrentDeliveryCard } from "@/components/deliveries/current-delivery-card";

export const metadata: Metadata = { title: "Corrida atual" };

export default function CurrentDeliveryPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Corrida vinculada"
        title="Corrida atual"
        description="Atualize cada etapa na ordem correta e abra coleta ou destino no aplicativo de navegação de sua preferência."
      />
      <CurrentDeliveryCard />
    </div>
  );
}
