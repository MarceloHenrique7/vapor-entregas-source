import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { RatingProfileSummary } from "@/components/reputation/rating-profile-summary";

export const metadata: Metadata = { title: "Perfil do motoboy" };

export default function MotoboyProfilePage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Perfil"
        title="Seu perfil"
        description="Acompanhe sua reputação sem ranking, punição automática ou exposição de comentários."
      />
      <RatingProfileSummary />
    </div>
  );
}
