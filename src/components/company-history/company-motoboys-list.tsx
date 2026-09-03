"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

import { FavoriteToggle } from "./favorite-toggle";

interface MotoboyItem {
  id: string;
  name: string;
  ratingAverage: number | null;
  ratingCount: number;
  completedWithCompany: number;
  lastDeliveryAt: string | null;
  lastCompletedDeliveryId: string;
  favoriteId: string | null;
  isOnline: boolean;
}

interface Result {
  items: MotoboyItem[];
  pagination: { page: number; total: number; totalPages: number };
}

export function CompanyMotoboysList() {
  const [result, setResult] = useState<Result | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        favoritesOnly: String(favoritesOnly),
      });
      if (appliedQuery) search.set("query", appliedQuery);
      const response = await fetch(`/api/company/motoboys?${search}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar os motoboys.",
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
  }, [appliedQuery, favoritesOnly, page]);

  useEffect(() => {
    async function loadMotoboys() {
      await load();
    }
    void loadMotoboys();
  }, [load]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <form
          onSubmit={search}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-bold">
            Buscar por nome
            <Input
              className="mt-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button type="submit">Buscar</Button>
          <Button
            type="button"
            variant={favoritesOnly ? "primary" : "outline"}
            onClick={() => {
              setFavoritesOnly((value) => !value);
              setPage(1);
            }}
          >
            Somente favoritos
          </Button>
        </form>
      </Card>
      {error && (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      )}
      {loading && (
        <Card className="p-6 text-sm text-muted">
          Carregando relacionamentos...
        </Card>
      )}
      {!loading && result?.items.length === 0 && (
        <Card>
          <EmptyState
            icon="users"
            title="Nenhum motoboy encontrado"
            description="A lista reúne apenas motoboys com ao menos uma entrega concluída para sua empresa."
          />
        </Card>
      )}
      {!loading &&
        result?.items.map((motoboy) => (
          <Card key={motoboy.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/empresa/motoboys/${motoboy.id}`}
                    className="motoboy-name-highlight rounded-lg font-display text-xl font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2"
                  >
                    {motoboy.name}
                  </Link>
                  <Badge
                    variant={motoboy.isOnline ? "success" : "neutral"}
                    className={motoboy.isOnline ? "online-status-badge" : ""}
                  >
                    {motoboy.isOnline ? "Online" : "Offline"}
                  </Badge>
                  {motoboy.favoriteId && (
                    <Badge variant="warning">Favorito</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <span>
                    {motoboy.ratingAverage === null
                      ? "Sem avaliações"
                      : `${motoboy.ratingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ★ (${motoboy.ratingCount})`}
                  </span>
                  <span>
                    {motoboy.completedWithCompany} concluída(s) com sua empresa
                  </span>
                  <span>
                    Última:{" "}
                    {motoboy.lastDeliveryAt
                      ? new Date(motoboy.lastDeliveryAt).toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/app/empresa/motoboys/${motoboy.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  Ver relacionamento
                </Link>
                <FavoriteToggle
                  initialFavoriteId={motoboy.favoriteId}
                  completedDeliveryId={motoboy.lastCompletedDeliveryId}
                  onChange={(favoriteId) =>
                    setResult((current) =>
                      current
                        ? {
                            ...current,
                            items: current.items.map((item) =>
                              item.id === motoboy.id
                                ? { ...item, favoriteId }
                                : item,
                            ),
                          }
                        : current,
                    )
                  }
                />
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
            Página {page} de {result.pagination.totalPages}
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
