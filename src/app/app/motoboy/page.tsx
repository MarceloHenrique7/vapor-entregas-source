import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { MotoboyPresenceCard } from "@/components/presence/motoboy-presence-card";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePageRole } from "@/server/auth/page-guard";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { getMySubscription } from "@/server/subscriptions/subscription-service";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "não informado";

export default async function MotoboyDashboard() {
  const user = await requirePageRole(["MOTOBOY"]);
  const billing = await getMySubscription(
    { userId: user.id, role: user.role, status: user.status },
    prismaSubscriptionRepository,
  );
  const paidActive =
    billing.subscription?.status === "ACTIVE" ||
    billing.subscription?.status === "TRIAL";
  const manualActive = billing.manualAccess?.status === "ACTIVE";
  const effectiveEnd =
    [
      paidActive ? billing.subscription?.currentPeriodEnd : null,
      manualActive ? billing.manualAccess?.endsAt : null,
    ]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const active = paidActive || manualActive;
  const daysRemaining = Math.max(
    paidActive ? (billing.subscription?.daysRemaining ?? 0) : 0,
    manualActive ? (billing.manualAccess?.daysRemaining ?? 0) : 0,
  );
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
          <Badge variant={active ? "success" : "warning"} className="mt-4">
            {active ? `Plano ${billing.plan.name} ativo` : "Sem plano ativo"}
          </Badge>
          <p className="mt-4 text-sm leading-6 text-muted">
            {active
              ? `Ativo até ${formatDate(effectiveEnd)}. ${daysRemaining} dia(s) restante(s).`
              : "Você não possui um plano ativo. Consulte as formas de ativação disponíveis."}
          </p>
          {manualActive && (
            <p className="mt-3 text-xs font-semibold text-sky-800">
              Acesso concedido pela equipe Vapor, sem pagamento registrado.
            </p>
          )}
          <Link
            href="/app/motoboy/assinatura"
            className={buttonStyles({ className: "mt-5 w-full" })}
          >
            {active ? "Ver assinatura" : "Ver planos"}
          </Link>
        </Card>
      </div>
    </div>
  );
}
import Link from "next/link";
