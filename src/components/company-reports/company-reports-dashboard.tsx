"use client";

/* eslint-disable react-hooks/set-state-in-effect -- protected API data is synchronized after mount */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DELIVERY_STATUS_LABELS } from "@/config/delivery";
import type { CompanyReportData } from "@/server/company-reports/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function CompanyReportsDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [motoboyId, setMotoboyId] = useState("");
  const [channel, setChannel] = useState("");
  const [report, setReport] = useState<CompanyReportData | null>(null);
  const [motoboys, setMotoboys] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    if (motoboyId) params.set("motoboyId", motoboyId);
    if (channel) params.set("channel", channel);
    return params.toString();
  }, [channel, from, motoboyId, status, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/company/reports?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        report?: CompanyReportData;
        motoboys?: Array<{ id: string; name: string }>;
        error?: string;
      };
      if (!response.ok || !payload.report) {
        setError(payload.error ?? "Não foi possível carregar o relatório.");
        return;
      }
      setReport(payload.report);
      setMotoboys(payload.motoboys ?? []);
    } catch {
      setError("Falha de conexão ao carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Operação"
        title="Relatórios"
        description="Exporte somente os dados da sua empresa, com totais transparentes e filtros do período."
      />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
          <Select
            aria-label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Motoboy"
            value={motoboyId}
            onChange={(event) => setMotoboyId(event.target.value)}
          >
            <option value="">Todos os motoboys</option>
            {motoboys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Canal"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="">Todos os canais</option>
            <option value="VAPOR">Vapor Entregas</option>
            <option value="MANUAL_CSV">Importação CSV</option>
            <option value="GENERIC_WEBHOOK">Webhook parceiro</option>
            <option value="IFOOD">iFood</option>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            Aplicar filtros
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      ) : loading || !report ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <a
              className={buttonStyles()}
              href={`/api/company/reports/export?format=pdf&${query}`}
            >
              Exportar PDF
            </a>
            <a
              className={buttonStyles({ variant: "outline" })}
              href={`/api/company/reports/export?format=xlsx&${query}`}
            >
              Exportar Excel (.xlsx)
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="package"
              label="Corridas"
              value={String(report.summary.totalDeliveries)}
              note={`${report.summary.completedDeliveries} concluída(s)`}
            />
            <StatCard
              icon="wallet"
              label="Valor registrado"
              value={money.format(report.summary.totalRecordedCents / 100)}
              note="Entregas concluídas"
            />
            <StatCard
              icon="wallet"
              label="Média registrada"
              value={money.format(report.summary.averageRecordedCents / 100)}
              note="Por concluída"
            />
            <StatCard
              icon="check"
              label="Pagamento confirmado"
              value={money.format(report.summary.confirmedPaymentCents / 100)}
              note="Conforme registro das partes"
            />
          </div>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {report.notice}
          </p>
          <Card className="overflow-hidden">
            {!report.rows.length ? (
              <EmptyState
                icon="file"
                title="Nenhuma entrega encontrada"
                description="Ajuste o período ou remova algum filtro."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Destino</th>
                      <th className="px-5 py-4">Motoboy</th>
                      <th className="px-5 py-4">Canal</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Valor registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {report.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-5 py-4 text-muted">
                          {dateTime.format(new Date(row.createdAt))}
                        </td>
                        <td className="px-5 py-4">
                          <strong>{row.destination}</strong>
                          <span className="block text-xs text-muted">
                            {row.destinationNeighborhood}
                          </span>
                        </td>
                        <td className="px-5 py-4">{row.motoboy}</td>
                        <td className="px-5 py-4">{row.channel}</td>
                        <td className="px-5 py-4">
                          {DELIVERY_STATUS_LABELS[
                            row.status as keyof typeof DELIVERY_STATUS_LABELS
                          ] ?? row.status}
                        </td>
                        <td className="px-5 py-4 text-right font-bold">
                          {money.format(row.finalRecordedValueCents / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
