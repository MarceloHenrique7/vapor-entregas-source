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

export function CompanyProDashboard({
  reportMode = false,
}: {
  reportMode?: boolean;
}) {
  const [period, setPeriod] = useState(reportMode ? "current_month" : "30d");
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
      trackMetaCustomEventOnce(
        `pro-dashboard:${reportMode ? "reports" : "overview"}`,
        "ProDashboardViewed",
        { view: reportMode ? "reports" : "overview" },
      );
    } catch {
      setError("Erro de rede ao carregar os indicadores.");
    } finally {
      setLoading(false);
    }
  }, [from, period, query, reportMode, to]);

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
        title={reportMode ? "Relatórios financeiros" : "Gestão da operação"}
        description="Indicadores calculados com as entregas registradas. Valores são declarações operacionais, não extrato bancário."
        action={<Badge variant="info">PRO</Badge>}
      />

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[15rem_1fr_1fr_auto]">
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
          <div className="hidden lg:block" />
        )}
        <Button variant="outline" onClick={() => void load()}>
          Atualizar
        </Button>
      </Card>

      {locked ? (
        <Card>
          <EmptyState
            icon="lock"
            title="Vapor Gestão Pro não habilitado"
            description="O plano Empresa continua gratuito. O acesso Pro está disponível apenas para empresas piloto liberadas pelo administrador e não possui cobrança nesta versão."
          />
        </Card>
      ) : error ? (
        <Card className="p-6 text-sm font-semibold text-red-700">{error}</Card>
      ) : loading || !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
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
              className="inline-flex min-h-10 items-center rounded-xl border border-line px-4 text-sm font-bold text-ink-soft hover:border-brand/40 hover:text-brand"
              href={`/api/company/pro/export?${query}`}
              onClick={() =>
                trackMetaCustomEvent("ReportExported", { format: "csv" })
              }
            >
              Exportar CSV
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="package"
              label="Entregas"
              value={String(overview.metrics.totalDeliveries)}
              note={`${overview.metrics.completedDeliveries} concluídas`}
            />
            <StatCard
              icon="wallet"
              label="Gasto registrado"
              value={currency.format(overview.metrics.totalRecordedSpend)}
              note="Somente entregas concluídas"
            />
            <StatCard
              icon="wallet"
              label="Custo médio"
              value={currency.format(overview.metrics.averageCost)}
              note="Por entrega concluída"
            />
            <StatCard
              icon="route"
              label="Distância concluída"
              value={`${number.format(overview.metrics.totalDistanceKm)} km`}
              note={
                overview.metrics.averageCostPerKm === null
                  ? "Custo/km indisponível"
                  : `${currency.format(overview.metrics.averageCostPerKm)}/km`
              }
            />
            <StatCard
              icon="check"
              label="Taxa de conclusão"
              value={`${number.format(overview.metrics.completionRate)}%`}
              note={`${overview.metrics.cancelledDeliveries} canceladas`}
            />
            <StatCard
              icon="users"
              label="Motoboys utilizados"
              value={String(overview.metrics.motoboysUsed)}
              note="Com entrega no período"
            />
            <StatCard
              icon="clock"
              label="Pagamentos pendentes"
              value={String(overview.metrics.pendingPayments)}
              note={currency.format(overview.metrics.pendingValue)}
            />
            <StatCard
              icon="check"
              label="Pagamentos confirmados"
              value={String(overview.metrics.confirmedPayments)}
              note={`${overview.metrics.activeDeliveries} entregas em andamento`}
            />
          </div>

          {reportMode && (
            <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Volume comparado ao período anterior
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {overview.comparison.deliveryChangePercent === null
                    ? "Sem base anterior"
                    : `${overview.comparison.deliveryChangePercent >= 0 ? "+" : ""}${number.format(overview.comparison.deliveryChangePercent)}%`}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {overview.comparison.previousDeliveries} entregas na base
                  anterior
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Gasto comparado ao período anterior
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {overview.comparison.spendChangePercent === null
                    ? "Sem base anterior"
                    : `${overview.comparison.spendChangePercent >= 0 ? "+" : ""}${number.format(overview.comparison.spendChangePercent)}%`}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {currency.format(overview.comparison.previousSpend)} na base
                  anterior
                </p>
              </div>
            </Card>
          )}

          {overview.metrics.totalDeliveries === 0 ? (
            <Card>
              <EmptyState
                icon="file"
                title="Sem dados no período"
                description="Altere o filtro ou aguarde novas entregas para gerar indicadores reais."
              />
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-lg font-extrabold">
                  Entregas por dia
                </h2>
                <div className="mt-5 space-y-3">
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
                <h2 className="font-display text-lg font-extrabold">
                  Distribuição por status
                </h2>
                <div className="mt-5 grid gap-3">
                  {overview.statuses.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between rounded-2xl bg-canvas p-4"
                    >
                      <span className="text-sm font-semibold">
                        {DELIVERY_STATUS_LABELS[
                          item.status as keyof typeof DELIVERY_STATUS_LABELS
                        ] ?? item.status}
                      </span>
                      <Badge>{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-lg font-extrabold">
                  Horários de maior volume
                </h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {overview.hours.slice(0, 8).map((item) => (
                    <Badge key={item.hour} variant="info">
                      {String(item.hour).padStart(2, "0")}:00 ·{" "}
                      {item.deliveries}
                    </Badge>
                  ))}
                </div>
              </Card>
              <Card className="p-5 sm:p-6">
                <h2 className="font-display text-lg font-extrabold">
                  Motoboys mais utilizados
                </h2>
                <div className="mt-5 space-y-3">
                  {overview.topMotoboys.length ? (
                    overview.topMotoboys.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-canvas p-4"
                      >
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-muted">
                            {item.deliveries} entregas
                          </p>
                        </div>
                        <p className="font-bold text-brand">
                          {currency.format(item.spend)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">
                      Nenhuma entrega concluída com motoboy no período.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
