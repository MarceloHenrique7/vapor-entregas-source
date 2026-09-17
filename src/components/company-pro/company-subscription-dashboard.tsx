import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CompanyPlanOverview } from "@/server/company-pro/types";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
        new Date(value),
      )
    : "Sem vencimento";

const freeFeatures = [
  "Publicar e acompanhar entregas",
  "Encontrar motoboys e manter favoritos",
  "VaporPay básico e histórico operacional",
  "Avaliações, denúncias e notificações",
];

const proFeatures = [
  "Dashboard financeiro avançado",
  "Comparação de períodos e métricas operacionais",
  "Gastos, custo médio e custo por quilômetro quando disponível",
  "Horários de pico, motoboys mais utilizados e exportação CSV",
];

export function CompanySubscriptionDashboard({
  overview,
}: {
  overview: CompanyPlanOverview;
}) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Plano da empresa"
        title="Plano e Gestão Pro"
        description="Compare os recursos atuais. O valor das entregas continua sendo combinado diretamente com o motoboy."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <Badge variant={!overview.proEffective ? "success" : "neutral"}>
            {!overview.proEffective ? "Seu plano atual" : "Plano base"}
          </Badge>
          <h2 className="mt-4 font-display text-2xl font-extrabold">
            Gratuito — R$ 0,00
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            {freeFeatures.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
        </Card>
        <Card className="border-brand/25 p-6 sm:p-8">
          <Badge variant={overview.proEffective ? "success" : "warning"}>
            {overview.proEffective ? "Seu plano atual" : "Acesso opcional"}
          </Badge>
          <h2 className="mt-4 font-display text-2xl font-extrabold">
            Vapor Gestão Pro
          </h2>
          <p className="mt-2 text-sm text-muted">
            Tenha mais controle sobre sua operação de entregas.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            {proFeatures.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
          {overview.proEffective ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">Acesso Pro ativo</p>
              <p className="mt-1">
                {overview.proExpiresAt
                  ? `Válido até ${formatDate(overview.proExpiresAt)}.`
                  : "Acesso administrativo sem vencimento."}
              </p>
              <Link
                href="/app/empresa/gestao"
                className={buttonStyles({ className: "mt-4" })}
              >
                Abrir Gestão Pro
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">
                Preço e checkout ainda não configurados
              </p>
              <p className="mt-1 leading-6">
                O upgrade não realiza cobrança. A liberação é feita pela equipe
                Vapor até existir uma oferta comercial oficial.
              </p>
              <Button className="mt-4" disabled>
                Upgrade indisponível
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
