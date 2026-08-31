import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { MotoboyPresenceCard } from "@/components/presence/motoboy-presence-card";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function MotoboyDashboard() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Visão geral"
        title="Olá! Você escolhe quando estar disponível."
        description="Controle sua presença livremente. Não há escala, jornada mínima ou punição por ficar offline."
      />
      <MotoboyPresenceCard />
      <div className="flex justify-end">
        <InstallAppButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon="package"
          label="Oportunidades"
          value="Ao vivo"
          note="Consulte a lista em tempo real"
        />
        <StatCard
          icon="check"
          label="Entregas concluídas"
          value="0"
          note="Seu histórico começa aqui"
        />
        <StatCard
          icon="star"
          label="Avaliação"
          value="—"
          note="Após entregas concluídas"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card>
          <div className="border-b border-line px-6 py-5">
            <h2 className="font-display text-lg font-extrabold">
              Oportunidades próximas
            </h2>
          </div>
          <EmptyState
            icon="route"
            title="Oportunidades em uma área dedicada"
            description="Abra Oportunidades para ver ofertas compatíveis e decidir livremente se deseja aceitar alguma delas."
          />
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-extrabold">Assinatura</h2>
          <Badge variant="warning" className="mt-4">
            Configuração futura
          </Badge>
          <p className="mt-4 text-sm leading-6 text-muted">
            Seu plano e período de acesso serão exibidos neste espaço. Não há
            saldo ou carteira de corridas.
          </p>
        </Card>
      </div>
    </div>
  );
}
