"use client";

/* eslint-disable react-hooks/set-state-in-effect -- synchronizes authenticated billing state */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Status =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED";

interface SubscriptionView {
  id: string;
  status: Status;
  managedByProvider: boolean;
  canReactivate: boolean;
  monthlyPrice: number;
  checkoutUrl: string | null;
  currentPeriodEnd: string | null;
  nextPaymentAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

interface Result {
  plan: {
    role: "MOTOBOY" | "COMPANY";
    name: string;
    description: string;
    monthlyPrice: number;
    trialDays: number;
  };
  subscription: SubscriptionView | null;
}

const labels: Record<Status, string> = {
  TRIAL: "Teste grátis",
  PENDING: "Aguardando confirmação",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento pendente",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

const paymentLabels: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  in_process: "Em análise",
  rejected: "Recusado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  refunded: "Estornado",
  charged_back: "Contestado",
};

const benefits = {
  MOTOBOY: [
    "Acesso às oportunidades de entrega",
    "Organização de corridas e histórico",
    "Reputação e suporte da plataforma",
  ],
  COMPANY: [
    "Publicação de novas entregas",
    "Acompanhamento operacional em tempo real",
    "Histórico, favoritos e suporte da plataforma",
  ],
} as const;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Não informado";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível concluir a operação.");
  }
  return body as T;
}

export function SubscriptionDashboard() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<Result>("/api/subscriptions/me"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const action = async (path: string, body: object = {}) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ subscription: SubscriptionView | null }>(
        path,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (
        result.subscription?.checkoutUrl &&
        (path.includes("checkout") || result.subscription.status === "PENDING")
      ) {
        window.location.assign(result.subscription.checkoutUrl);
        return;
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <Card>
        <EmptyState
          icon="wallet"
          title="Assinatura indisponível"
          description={error || "Tente novamente em instantes."}
          action={<Button onClick={load}>Tentar novamente</Button>}
        />
      </Card>
    );
  }
  const subscription = data.subscription;
  const operational =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIAL";
  const lastPayment = subscription?.payments[0] ?? null;

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Acesso comercial"
        title="Minha assinatura"
        description="A mensalidade é da plataforma. Valores de entregas continuam sendo pagos diretamente entre as partes."
        action={
          <Link href="/planos" className="text-sm font-bold text-brand">
            Ver planos
          </Link>
        }
      />
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Badge
              variant={
                operational
                  ? "success"
                  : subscription?.status === "PENDING" ||
                      subscription?.status === "PAST_DUE"
                    ? "warning"
                    : "neutral"
              }
            >
              {subscription ? labels[subscription.status] : "Sem assinatura"}
            </Badge>
            <h2 className="mt-4 font-display text-2xl font-extrabold">
              Plano {data.plan.name}
            </h2>
            <p className="mt-2 text-sm text-muted">{data.plan.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {benefits[data.plan.role].map((benefit) => (
                <li key={benefit}>✓ {benefit}</li>
              ))}
            </ul>
          </div>
          <p className="font-display text-3xl font-extrabold text-brand">
            {money.format(subscription?.monthlyPrice ?? data.plan.monthlyPrice)}
            <span className="text-sm text-muted">/mês</span>
          </p>
        </div>
        <dl className="mt-7 grid gap-4 rounded-2xl bg-canvas p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Próxima cobrança</dt>
            <dd className="mt-1 font-bold">
              {date(subscription?.nextPaymentAt ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Fim do período atual/teste</dt>
            <dd className="mt-1 font-bold">
              {date(subscription?.currentPeriodEnd ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Última cobrança</dt>
            <dd className="mt-1 font-bold">
              {lastPayment
                ? `${money.format(lastPayment.amount)} · ${paymentLabels[lastPayment.status] ?? lastPayment.status}`
                : "Nenhuma cobrança registrada"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {(!subscription ||
            ["CANCELED", "EXPIRED"].includes(subscription.status)) && (
            <Button
              disabled={busy}
              onClick={() => action("/api/subscriptions/checkout")}
            >
              {busy
                ? "Preparando…"
                : data.plan.trialDays > 0 && !subscription
                  ? "Começar teste grátis"
                  : "Assinar plano"}
            </Button>
          )}
          {subscription?.status === "PENDING" && subscription.checkoutUrl && (
            <Button
              disabled={busy}
              onClick={() => window.location.assign(subscription.checkoutUrl!)}
            >
              Concluir autorização
            </Button>
          )}
          {subscription?.status === "PAST_DUE" && subscription.checkoutUrl && (
            <Button
              onClick={() => window.location.assign(subscription.checkoutUrl!)}
            >
              Regularizar pagamento
            </Button>
          )}
          {subscription?.canReactivate && (
            <Button
              disabled={busy}
              onClick={() => action("/api/subscriptions/reactivate")}
            >
              Reativar
            </Button>
          )}
          {subscription?.managedByProvider &&
            !["CANCELED", "EXPIRED"].includes(subscription.status) && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => action("/api/subscriptions/sync")}
              >
                Atualizar situação
              </Button>
            )}
          {subscription &&
            !["CANCELED", "EXPIRED"].includes(subscription.status) && (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Cancelar assinatura
              </Button>
            )}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="font-display text-xl font-extrabold">
          Histórico de pagamentos
        </h2>
        {subscription?.payments.length ? (
          <ul className="mt-4 divide-y divide-line">
            {subscription.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p className="font-bold">{money.format(payment.amount)}</p>
                  <p className="text-muted">
                    {date(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    payment.status === "approved" ? "success" : "neutral"
                  }
                >
                  {paymentLabels[payment.status] ?? payment.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Nenhuma cobrança recorrente registrada.
          </p>
        )}
      </Card>
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar assinatura?"
        description="O acesso a novas operações será bloqueado. Corridas já em andamento não serão interrompidas."
      >
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setCancelOpen(false)}
          >
            Voltar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              setCancelOpen(false);
              void action("/api/subscriptions/cancel", { confirm: true });
            }}
          >
            Confirmar cancelamento
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
