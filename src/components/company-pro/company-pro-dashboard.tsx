"use client";

/* eslint-disable react-hooks/set-state-in-effect -- dashboard data is synchronized with the protected API */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DELIVERY_STATUS_LABELS } from "@/config/delivery";
import {
  trackMetaCustomEvent,
  trackMetaCustomEventOnce,
} from "@/lib/analytics/meta-pixel";
import type { CompanyProOverview } from "@/server/company-pro/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function changeLabel(value: number | null) {
  if (value === null) return "Sem base anterior";
  return `${value >= 0 ? "+" : ""}${number.format(value)}%`;
}

function MetricLine({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <div>
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      </div>
      <p className="shrink-0 font-display text-lg font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}

export function CompanyProDashboard() {
  const [period, setPeriod] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState<CompanyProOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const search = new URLSearchParams({ period });
    if (period === "custom" && from && to) {
      search.set("from", from);
      search.set("to", to);
    }
    return search.toString();
  }, [from, period, to]);

  const load = useCallback(async () => {
    if (period === "custom" && (!from || !to)) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/company/pro/overview?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        overview?: CompanyProOverview;
        error?: string;
        code?: string;
      };
      if (response.status === 403 && payload.code === "COMPANY_PRO_REQUIRED") {
        setLocked(true);
        setOverview(null);
        return;
      }
      if (!response.ok || !payload.overview) {
        setError(payload.error ?? "Não foi possível carregar os indicadores.");
        return;
      }
      setLocked(false);
      setOverview(payload.overview);
      trackMetaCustomEventOnce("pro-dashboard:overview", "ProDashboardViewed", {
        view: "overview",
      });
    } catch {
      setError("Erro de rede ao carregar os indicadores.");
    } finally {
      setLoading(false);
    }
  }, [from, period, query, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = Math.max(
    1,
    ...(overview?.daily.map((item) => item.deliveries) ?? []),
  );

  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Vapor Gestão Pro"
        title="Gestão da operação"
        description="Indicadores operacionais e financeiros reunidos em uma única visão."
        action={<Badge variant="info">PRO</Badge>}
      />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[15rem_1fr_1fr_auto]">
          <Select
            aria-label="Período"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="current_month">Mês atual</option>
            <option value="previous_month">Mês anterior</option>
            <option value="custom">Intervalo personalizado</option>
          </Select>
          {period === "custom" ? (
            <>
              <Input
                aria-label="Data inicial"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                aria-label="Data final"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </>
          ) : (
            <div className="hidden lg:col-span-2 lg:block" />
          )}
          <Button variant="outline" onClick={() => void load()}>
            Atualizar
          </Button>
        </div>
      </Card>

      {locked ? (
        <Card>
          <EmptyState
            icon="lock"
            title="Gestão Pro não habilitada"
            description="O plano Empresa continua gratuito. O acesso Pro é liberado pela equipe Vapor para empresas piloto."
          />
        </Card>
      ) : error ? (
        <Card className="p-6 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      ) : loading || !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">
              {overview.period.label}
            </p>
            <a
              className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-bold text-ink-soft hover:border-brand/40 hover:text-brand"
              href={`/api/company/pro/export?${query}`}
              onClick={() =>
                trackMetaCustomEvent("ReportExported", { format: "csv" })
              }
            >
              Exportar dados em CSV
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="wallet"
              label="Gasto total"
              value={currency.format(overview.metrics.totalRecordedSpend)}
              note={changeLabel(overview.comparison.spendChangePercent)}
            />
            <StatCard
              icon="package"
              label="Entregas"
              value={String(overview.metrics.totalDeliveries)}
              note={changeLabel(overview.comparison.deliveryChangePercent)}
            />
            <StatCard
              icon="wallet"
              label="Custo médio"
              value={currency.format(overview.metrics.averageCost)}
              note="Por entrega concluída"
            />
            <StatCard
              icon="check"
              label="Taxa de conclusão"
              value={`${number.format(overview.metrics.completionRate)}%`}
              note={`${overview.metrics.cancelledDeliveries} cancelada(s)`}
            />
          </div>

          {overview.metrics.totalDeliveries === 0 ? (
            <Card>
              <EmptyState
                icon="file"
                title="Ainda não há dados suficientes neste período"
                description="Escolha outro período para consultar indicadores já registrados."
              />
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold">
                  Desempenho
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Volume e andamento das entregas.
                </p>
                <div className="mt-4">
                  <MetricLine
                    label="Concluídas"
                    value={String(overview.metrics.completedDeliveries)}
                  />
                  <MetricLine
                    label="Em andamento"
                    value={String(overview.metrics.activeDeliveries)}
                  />
                  <MetricLine
                    label="Canceladas"
                    value={String(overview.metrics.cancelledDeliveries)}
                  />
                  <MetricLine
                    label="Período anterior"
                    value={`${overview.comparison.previousDeliveries} entrega(s)`}
                    note={`${currency.format(overview.comparison.previousSpend)} registrados`}
                  />
                </div>
                <div className="mt-5 space-y-3" aria-label="Entregas por dia">
                  {overview.daily.map((item) => (
                    <div key={item.day}>
                      <div className="flex justify-between gap-3 text-xs font-semibold text-muted">
                        <span>{item.day.split("-").reverse().join("/")}</span>
                        <span>
                          {item.deliveries} · {currency.format(item.spend)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.max(3, (item.deliveries / maxDaily) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold">Custos</h2>
                <p className="mt-1 text-sm text-muted">
                  Valores informados nas entregas concluídas.
                </p>
                <div className="mt-4">
                  <MetricLine
                    label="Distância concluída"
                    value={`${number.format(overview.metrics.totalDistanceKm)} km`}
                  />
                  <MetricLine
                    label="Custo por quilômetro"
                    value={
                      overview.metrics.averageCostPerKm === null
                        ? "Indisponível"
                        : `${currency.format(overview.metrics.averageCostPerKm)}/km`
                    }
                  />
                  <MetricLine
                    label="Pagamentos pendentes"
                    value={currency.format(overview.metrics.pendingValue)}
                    note={`${overview.metrics.pendingPayments} entrega(s)`}
                  />
                  <MetricLine
                    label="Pagamentos confirmados"
                    value={String(overview.metrics.confirmedPayments)}
                  />
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold">
                  Motoboys
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {overview.metrics.motoboysUsed} motoboy(s) no período.
                </p>
                <div className="mt-4 space-y-1">
                  {overview.topMotoboys.length ? (
                    overview.topMotoboys.map((item) => (
                      <MetricLine
                        key={item.name}
                        label={item.name}
                        value={currency.format(item.spend)}
                        note={`${item.deliveries} entrega(s)`}
                      />
                    ))
                  ) : (
                    <p className="py-4 text-sm text-muted">
                      Nenhuma entrega concluída com motoboy neste período.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold">
                  Operação
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Horários de pico e distribuição por status.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {overview.hours.slice(0, 6).map((item) => (
                    <Badge key={item.hour} variant="info">
                      {String(item.hour).padStart(2, "0")}:00 ·{" "}
                      {item.deliveries}
                    </Badge>
                  ))}
                </div>
                <div className="mt-5 divide-y divide-line">
                  {overview.statuses.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <span className="text-sm font-semibold text-ink-soft">
                        {DELIVERY_STATUS_LABELS[
                          item.status as keyof typeof DELIVERY_STATUS_LABELS
                        ] ?? "Outro estado"}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
