"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DELIVERY_EXTRA_TYPE_LABELS,
  DELIVERY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type { DeliveryStatus } from "@/server/deliveries/types";

interface HistoryItem {
  id: string;
  motoboyId: string | null;
  motoboyName: string | null;
  pickupAddress: string;
  pickupNumber: string;
  pickupNeighborhood: string;
  pickupCity: string;
  destinationAddress: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationCity: string;
  distanceEstimateKm: number;
  distanceMethod: "STRAIGHT_LINE" | "GOOGLE_ROUTES";
  suggestedPrice: number | null;
  offeredPrice: number;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS;
  status: DeliveryStatus;
  companyRating: number | null;
  completedAt: string | null;
  createdAt: string;
  extras: Array<{
    id: string;
    type: keyof typeof DELIVERY_EXTRA_TYPE_LABELS;
    description: string;
    amount: number | null;
    status: string;
  }>;
}

interface HistoryResponse {
  items: HistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  motoboys: Array<{ id: string; name: string }>;
}

const statusOptions = Object.entries(DELIVERY_STATUS_LABELS) as Array<
  [DeliveryStatus, string]
>;

export function CompanyHistoryList() {
  const [result, setResult] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    motoboyId: "",
    city: "",
    query: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(filters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      Object.entries(applied).forEach(
        ([key, value]) => value && search.set(key, value),
      );
      const response = await fetch(`/api/company/history?${search}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as HistoryResponse & {
        error?: string;
      };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar o histórico.",
          ),
        );
        return;
      }
      setResult(payload);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    async function loadHistory() {
      await load();
    }
    void loadHistory();
  }, [load]);

  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <form
          onSubmit={apply}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <label className="text-sm font-bold">
            Busca
            <Input
              className="mt-2"
              value={filters.query}
              onChange={(event) =>
                setFilters((value) => ({ ...value, query: event.target.value }))
              }
              placeholder="Rua, bairro ou motoboy"
            />
          </label>
          <label className="text-sm font-bold">
            Status
            <Select
              className="mt-2"
              value={filters.status}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  status: event.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-bold">
            Motoboy
            <Select
              className="mt-2"
              value={filters.motoboyId}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  motoboyId: event.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {result?.motoboys.map((motoboy) => (
                <option key={motoboy.id} value={motoboy.id}>
                  {motoboy.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-bold">
            Cidade
            <Select
              className="mt-2"
              value={filters.city}
              onChange={(event) =>
                setFilters((value) => ({ ...value, city: event.target.value }))
              }
            >
              <option value="">Todas</option>
              <option value="PETROLINA_PE">Petrolina / PE</option>
              <option value="JUAZEIRO_BA">Juazeiro / BA</option>
            </Select>
          </label>
          <label className="text-sm font-bold">
            De
            <Input
              className="mt-2"
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((value) => ({ ...value, from: event.target.value }))
              }
            />
          </label>
          <label className="text-sm font-bold">
            Até
            <Input
              className="mt-2"
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((value) => ({ ...value, to: event.target.value }))
              }
            />
          </label>
          <div className="flex gap-3 md:col-span-2 xl:col-span-3">
            <Button type="submit">Aplicar filtros</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const empty = {
                  status: "",
                  motoboyId: "",
                  city: "",
                  query: "",
                  from: "",
                  to: "",
                };
                setFilters(empty);
                setApplied(empty);
                setPage(1);
              }}
            >
              Limpar
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      )}
      {loading && (
        <Card className="p-6 text-sm text-muted">Carregando entregas...</Card>
      )}
      {!loading && result?.items.length === 0 && (
        <Card>
          <EmptyState
            icon="history"
            title="Nenhuma entrega encontrada"
            description="Ajuste os filtros ou crie uma nova oportunidade."
          />
        </Card>
      )}
      {!loading &&
        result?.items.map((delivery) => (
          <Card key={delivery.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      delivery.status === "COMPLETED" ? "success" : "neutral"
                    }
                  >
                    {DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                  <span className="text-xs text-muted">
                    {new Date(delivery.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-extrabold">
                  {delivery.pickupNeighborhood} →{" "}
                  {delivery.destinationNeighborhood}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Coleta: {delivery.pickupAddress}, {delivery.pickupNumber} ·
                  Destino: {delivery.destinationAddress},{" "}
                  {delivery.destinationNumber}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span className="font-bold text-ink">
                    {delivery.motoboyName ?? "Sem motoboy vinculado"}
                  </span>
                  <span>
                    {delivery.distanceEstimateKm.toLocaleString("pt-BR")} km
                    {delivery.distanceMethod === "GOOGLE_ROUTES"
                      ? " por rota"
                      : " em linha reta"}
                  </span>
                  <span>
                    R${" "}
                    {delivery.offeredPrice.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  {delivery.suggestedPrice !== null && (
                    <span>
                      Sugestão registrada: R${" "}
                      {delivery.suggestedPrice.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                  <span>{PAYMENT_METHOD_LABELS[delivery.paymentMethod]}</span>
                </div>
                {delivery.companyRating !== null && (
                  <p className="mt-3 text-sm font-bold text-brand-dark">
                    Sua avaliação: {delivery.companyRating} ★
                  </p>
                )}
                {delivery.extras.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {delivery.extras.map((extra) => (
                      <Badge key={extra.id} variant="warning">
                        {DELIVERY_EXTRA_TYPE_LABELS[extra.type]}
                        {extra.amount === null
                          ? ""
                          : ` · R$ ${extra.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/app/empresa/entregas/${delivery.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  Ver detalhes
                </Link>
                <Link
                  href={`/app/empresa/entregas/nova?repetir=${delivery.id}`}
                  className={buttonStyles({ size: "sm" })}
                >
                  Repetir entrega
                </Link>
                {delivery.motoboyId && (
                  <Link
                    href={`/app/empresa/motoboys/${delivery.motoboyId}`}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    Histórico com motoboy
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">
            Página {result.pagination.page} de {result.pagination.totalPages} ·{" "}
            {result.pagination.total} registros
          </span>
          <Button
            variant="outline"
            disabled={page >= result.pagination.totalPages || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
