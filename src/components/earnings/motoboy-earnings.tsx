"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DELIVERY_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type {
  EarningsPeriod,
  MotoboyEarningsView,
} from "@/server/earnings/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const periods: Array<{ value: EarningsPeriod; label: string }> = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

const badgeVariant = {
  UNTRACKED: "neutral",
  PENDING: "warning",
  REPORTED_PAID: "info",
  CONFIRMED: "success",
  DISPUTED: "warning",
} as const;

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="p-5 shadow-none">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </Card>
  );
}

export function MotoboyEarnings() {
  const [period, setPeriod] = useState<EarningsPeriod>("30");
  const [earnings, setEarnings] = useState<MotoboyEarningsView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/motoboy/earnings?period=${period}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        earnings?: MotoboyEarningsView;
        error?: string;
      };
      if (!response.ok || !payload.earnings) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar seus ganhos.",
          ),
        );
        return;
      }
      setEarnings(payload.earnings);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Período">
        {periods.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setPeriod(item.value)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold transition ${
              period === item.value
                ? "bg-ink text-white"
                : "border border-line bg-white text-ink-soft hover:border-brand/40"
            }`}
            aria-pressed={period === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      )}

      {loading && !earnings ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : earnings ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total concluído"
              value={currency.format(earnings.totals.gross)}
              note={`${earnings.totals.deliveries} entregas`}
            />
            <SummaryCard
              label="Recebido confirmado"
              value={currency.format(earnings.totals.confirmed)}
              note="Confirmado por você"
            />
            <SummaryCard
              label="A confirmar"
              value={currency.format(earnings.totals.awaitingConfirmation)}
              note="Pagamento direto pendente"
            />
            <SummaryCard
              label="Em divergência"
              value={currency.format(earnings.totals.disputed)}
              note="Requer conferência"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-display text-xl font-extrabold">
                  Entregas concluídas
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Até 50 registros recentes do período.
                </p>
              </div>
              <Link
                href="/app/motoboy/historico"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Ver histórico
              </Link>
            </div>

            {earnings.deliveries.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="Nenhum ganho neste período"
                description="Entregas concluídas aparecerão aqui."
              />
            ) : (
              <div className="divide-y divide-line">
                {earnings.deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {delivery.companyName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {date.format(new Date(delivery.completedAt))} ·{" "}
                        {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Badge variant={badgeVariant[delivery.paymentStatus]}>
                        {DELIVERY_PAYMENT_STATUS_LABELS[delivery.paymentStatus]}
                      </Badge>
                      <p className="font-display text-lg font-extrabold">
                        {currency.format(delivery.offeredPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="flex gap-2 text-xs leading-5 text-muted">
            <Icon name="shield" className="mt-0.5 size-4 shrink-0" />
            Valores informativos das entregas. O pagamento é combinado e feito
            diretamente entre empresa e motoboy; a plataforma não guarda saldo.
          </p>
        </>
      ) : null}
    </div>
  );
}
