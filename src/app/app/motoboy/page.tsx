import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Icon } from "@/components/icons/icon";
import { MotoboyPresenceCard } from "@/components/presence/motoboy-presence-card";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        {[
          {
            href: "/app/motoboy/corrida",
            icon: "route" as const,
            title: "Corrida atual",
            description: "Continue a entrega e atualize a próxima etapa.",
          },
          {
            href: "/app/motoboy/oportunidades",
            icon: "package" as const,
            title: "Oportunidades",
            description: "Veja valor, rota e condições antes de aceitar.",
          },
          {
            href: "/app/motoboy/historico",
            icon: "history" as const,
            title: "Histórico",
            description: "Consulte entregas, pagamentos e avaliações.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[1.5rem] border border-line/80 bg-white p-5 shadow-card transition hover:border-brand/30"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-light text-brand">
              <Icon name={item.icon} className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-extrabold">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
        <Card className="p-6">
          <h2 className="font-display text-lg font-extrabold">Próximo passo</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Fique online para receber oportunidades próximas. Você decide
            livremente se deseja aceitar cada corrida.
          </p>
          <Link
            href="/app/motoboy/oportunidades"
            className={buttonStyles({ className: "mt-5" })}
          >
            Ver oportunidades
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-extrabold">Seu plano</h2>
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
            Ver assinatura
          </Link>
        </Card>
      </div>
    </div>
  );
}
