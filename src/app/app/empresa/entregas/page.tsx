import type { Metadata } from "next";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { CompanyDeliveriesList } from "@/components/deliveries/company-deliveries-list";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Entregas" };

export default function CompanyDeliveriesPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Área da empresa"
        title="Entregas"
        description="Acompanhe oportunidades, motoboy responsável e cada etapa operacional em tempo real."
        action={
          <Link href="/app/empresa/entregas/nova" className={buttonStyles()}>
            Nova entrega
          </Link>
        }
      />
      <CompanyDeliveriesList />
    </div>
  );
}
