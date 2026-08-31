"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { FavoriteView } from "@/server/reputation/types";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

export function FavoritesList() {
  const [favorites, setFavorites] = useState<FavoriteView[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      const payload = (await response.json()) as {
        favorites?: FavoriteView[];
        error?: string;
      };
      if (!response.ok || !payload.favorites) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar os favoritos.",
          ),
        );
        return;
      }
      setFavorites(payload.favorites);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    }
  }, []);

  useEffect(() => {
    async function loadInitialFavorites() {
      await load();
    }
    void loadInitialFavorites();
  }, [load]);

  async function remove(id: string) {
    setRemoving(id);
    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível remover o favorito.",
          ),
        );
        return;
      }
      setFavorites(
        (current) => current?.filter((item) => item.id !== id) ?? [],
      );
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setRemoving(null);
    }
  }

  if (!favorites && !error)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!favorites)
    return (
      <Card className="p-5 text-sm font-semibold text-red-700">{error}</Card>
    );
  if (favorites.length === 0)
    return (
      <Card>
        <EmptyState
          icon="heart"
          title="Nenhum motoboy favorito"
          description="Após uma entrega concluída, use o histórico para favoritar o motoboy."
        />
      </Card>
    );

  return (
    <div className="space-y-4">
      {error && (
        <p
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {favorites.map((favorite) => (
        <Card key={favorite.id} className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold">
                  {favorite.name}
                </h2>
                <Badge variant={favorite.isOnline ? "success" : "neutral"}>
                  {favorite.isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span>
                  {favorite.ratingAverage === null
                    ? "Sem avaliações"
                    : `${favorite.ratingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★ (${favorite.ratingCount})`}
                </span>
                <span>{favorite.completedDeliveries} entregas concluídas</span>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={removing === favorite.id}
              onClick={() => remove(favorite.id)}
            >
              {removing === favorite.id
                ? "Removendo..."
                : "Remover dos favoritos"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
