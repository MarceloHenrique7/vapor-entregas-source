import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { FreightCalculator } from "@/components/pricing/freight-calculator";

export const metadata: Metadata = { title: "Calculadora de frete" };

export default function FreightCalculatorPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Planejamento"
        title="Calculadora de frete"
        description="Faça uma estimativa antes de publicar a oportunidade, usando a regra ativa da Vapor para sua cidade."
      />
      <FreightCalculator />
    </div>
  );
}
