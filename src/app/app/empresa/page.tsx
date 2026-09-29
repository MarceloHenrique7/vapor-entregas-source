import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { CompanyHomeOverview } from "@/components/dashboard/company-home-overview";
import { buttonStyles } from "@/components/ui/button";

export default function CompanyDashboard() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Visão geral"
        title="Sua operação local começa aqui."
        description="Publique entregas, acompanhe cada etapa operacional e consulte seu histórico."
        action={
          <Link href="/app/empresa/entregas/nova" className={buttonStyles()}>
            Nova entrega
          </Link>
        }
      />
      <CompanyHomeOverview />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/app/empresa/historico"
          className="rounded-[1.75rem] border border-line/80 bg-white p-5 shadow-card transition hover:border-brand/30 hover:-translate-y-0.5"
        >
          <p className="font-display text-lg font-extrabold">
            Histórico completo
          </p>
          <p className="mt-2 text-sm text-muted">
            Filtre entregas e repita uma rota como rascunho.
          </p>
        </Link>
        <Link
          href="/app/empresa/motoboys"
          className="rounded-[1.75rem] border border-line/80 bg-white p-5 shadow-card transition hover:border-brand/30 hover:-translate-y-0.5"
        >
          <p className="font-display text-lg font-extrabold">
            Motoboys anteriores
          </p>
          <p className="mt-2 text-sm text-muted">
            Consulte relacionamentos e entregas em conjunto.
          </p>
        </Link>
        <Link
          href="/app/empresa/favoritos"
          className="rounded-[1.75rem] border border-line/80 bg-white p-5 shadow-card transition hover:border-brand/30 hover:-translate-y-0.5"
        >
          <p className="font-display text-lg font-extrabold">Favoritos</p>
          <p className="mt-2 text-sm text-muted">
            Organize motoboys com quem já trabalhou.
          </p>
        </Link>
      </div>
    </div>
  );
}
