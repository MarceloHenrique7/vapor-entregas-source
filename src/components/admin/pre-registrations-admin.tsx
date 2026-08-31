"use client";

/* eslint-disable react-hooks/set-state-in-effect -- API administrativa sincronizada por filtros */

import { useCallback, useEffect, useState } from "react";

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

interface Item {
  id: string;
  name: string;
  phone: string;
  type: "MOTOBOY" | "COMPANY";
  createdAt: string;
}

interface PageResult {
  items: Item[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

async function jsonApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar.");
  return body as T;
}

export function PreRegistrationsAdmin() {
  const [metrics, setMetrics] = useState<{
    total: number;
    motoboys: number;
    companies: number;
  } | null>(null);
  const [result, setResult] = useState<PageResult | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    type: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const filterBody = useCallback(
    () => ({
      page,
      pageSize: 20,
      query: appliedFilters.query || undefined,
      type: appliedFilters.type || undefined,
      from: appliedFilters.from || undefined,
      to: appliedFilters.to || undefined,
    }),
    [appliedFilters, page],
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const [overview, pageResult] = await Promise.all([
        jsonApi<{ metrics: NonNullable<typeof metrics> }>(
          "/api/admin/pre-registrations",
        ),
        jsonApi<PageResult>("/api/admin/pre-registrations/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filterBody()),
        }),
      ]);
      setMetrics(overview.metrics);
      setResult(pageResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar.");
    }
  }, [filterBody]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pre-registrations/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: appliedFilters.query || undefined,
          type: appliedFilters.type || undefined,
          from: appliedFilters.from || undefined,
          to: appliedFilters.to || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Não foi possível exportar.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vapor-pre-cadastros.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Pré-lançamento"
        title="Pré-cadastros"
        description="Contatos que autorizaram comunicação sobre o lançamento. Uso restrito à administração."
        action={
          <Button variant="outline" disabled={exporting} onClick={exportCsv}>
            {exporting ? "Exportando…" : "Exportar CSV"}
          </Button>
        }
      />
      {metrics ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={String(metrics.total)}
            icon="users"
            note="Interesses registrados"
          />
          <StatCard
            label="Motoboys"
            value={String(metrics.motoboys)}
            icon="bike"
            note="Entregadores interessados"
          />
          <StatCard
            label="Empresas"
            value={String(metrics.companies)}
            icon="building"
            note="Negócios interessados"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
      )}
      <Card className="p-5 sm:p-6">
        <form
          className="grid gap-3 md:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedFilters({ query, type, from, to });
          }}
        >
          <Input
            aria-label="Buscar por nome ou telefone"
            placeholder="Nome ou telefone"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            aria-label="Filtrar por tipo"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="MOTOBOY">Motoboy</option>
            <option value="COMPANY">Empresa</option>
          </Select>
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
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}
      {!result ? (
        <Skeleton className="h-80 rounded-3xl" />
      ) : result.items.length === 0 ? (
        <Card>
          <EmptyState
            icon="users"
            title="Nenhum pré-cadastro encontrado"
            description="Ajuste os filtros ou aguarde novos interessados."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {result.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.phone}</p>
                </div>
                <Badge variant={item.type === "MOTOBOY" ? "success" : "info"}>
                  {item.type === "MOTOBOY" ? "Motoboy" : "Empresa"}
                </Badge>
                <time className="text-xs text-muted">
                  {formatDate(item.createdAt)}
                </time>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line p-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted">
              Página {result.page} de {result.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= result.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
