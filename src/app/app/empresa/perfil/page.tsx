import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { RatingProfileSummary } from "@/components/reputation/rating-profile-summary";

export const metadata: Metadata = { title: "Perfil da empresa" };

export default function CompanyProfilePage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Perfil"
        title="Perfil da empresa"
        description="Acompanhe a reputação recebida sem expor comentários ou dados privados."
      />
      <RatingProfileSummary />
    </div>
  );
}
