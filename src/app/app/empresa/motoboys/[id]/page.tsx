import type { Metadata } from "next";

import { CompanyMotoboyRelationship } from "@/components/company-history/company-motoboy-relationship";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";

export const metadata: Metadata = { title: "Histórico com motoboy" };

export default async function CompanyMotoboyRelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Relacionamento operacional"
        title="Histórico com motoboy"
        description="Entregas realizadas em conjunto, datas, status e avaliações. Dados privados não fazem parte desta visualização."
      />
      <CompanyMotoboyRelationship motoboyId={id} />
    </div>
  );
}
