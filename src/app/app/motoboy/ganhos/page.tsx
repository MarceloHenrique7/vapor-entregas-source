import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { MotoboyEarnings } from "@/components/earnings/motoboy-earnings";

export const metadata: Metadata = { title: "Meus ganhos" };

export default function MotoboyEarningsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Área do motoboy"
        title="Meus ganhos"
        description="Valores das entregas concluídas e confirmações de recebimento."
      />
      <MotoboyEarnings />
    </div>
  );
}
