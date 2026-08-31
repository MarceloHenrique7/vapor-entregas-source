import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { MotoboyOpportunitiesList } from "@/components/deliveries/motoboy-opportunities-list";

export const metadata: Metadata = { title: "Oportunidades" };

export default function MotoboyOpportunitiesPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Escolha livre"
        title="Oportunidades próximas"
        description="Veja previamente coleta, destino, distância aproximada, valor e pagamento. Aceitar ou ignorar é sempre sua escolha."
      />
      <MotoboyOpportunitiesList />
    </div>
  );
}
