import type { Metadata } from "next";

import { CompanyMotoboysList } from "@/components/company-history/company-motoboys-list";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";

export const metadata: Metadata = { title: "Motoboys anteriores" };

export default function CompanyMotoboysPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Relacionamentos"
        title="Motoboys anteriores"
        description="Consulte profissionais que já concluíram entregas para sua empresa, avaliações públicas agregadas e favoritos. Nenhuma coordenada é exibida."
      />
      <CompanyMotoboysList />
    </div>
  );
}
