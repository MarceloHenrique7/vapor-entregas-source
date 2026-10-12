import type { Metadata } from "next";

import { CompanyDeliveryContext } from "@/components/company-history/company-delivery-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { DeliveryDetailCard } from "@/components/deliveries/delivery-detail-card";

export const metadata: Metadata = { title: "Acompanhar entrega" };

export default async function CompanyDeliveryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Entrega"
        title="Acompanhamento"
        description="Status, rota e próximas ações em um só lugar."
      />
      <DeliveryDetailCard
        endpoint={`/api/deliveries/${id}`}
        actorRole="COMPANY"
      />
      <CompanyDeliveryContext deliveryId={id} />
    </div>
  );
}
