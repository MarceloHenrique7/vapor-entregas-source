import Link from "next/link";

import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="users"
          label="Motoboys próximos"
          value="—"
          note="Disponibilidade em etapa futura"
        />
        <StatCard
          icon="clock"
          label="Em andamento"
          value="0"
          note="Nenhuma entrega ativa"
        />
        <StatCard
          icon="check"
          label="Concluídas hoje"
          value="0"
          note="Sem registros hoje"
        />
        <StatCard
          icon="wallet"
          label="Valor informado"
          value="R$ 0"
          note="Não processado pela plataforma"
        />
      </div>
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
      <Card>
        <div className="border-b border-line px-6 py-5">
          <h2 className="font-display text-lg font-extrabold">
            Entregas recentes
          </h2>
        </div>
        <EmptyState
          icon="package"
          title="Sua primeira entrega aparecerá aqui"
          description="Publique uma oportunidade para encontrar um motoboy disponível na sua região."
          action={
            <Link
              href="/app/empresa/entregas/nova"
              className={buttonStyles({ variant: "outline" })}
            >
              Criar entrega
            </Link>
          }
        />
      </Card>
    </div>
  );
}
