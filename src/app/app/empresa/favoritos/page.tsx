import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { FavoritesList } from "@/components/reputation/favorites-list";

export const metadata: Metadata = { title: "Motoboys favoritos" };

export default function CompanyFavoritesPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Relacionamento"
        title="Motoboys favoritos"
        description="Consulte motoboys favoritados, nota, entregas concluídas e presença atual. Favoritos não recebem prioridade automática."
      />
      <FavoritesList />
    </div>
  );
}
