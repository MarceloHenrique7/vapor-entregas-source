"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DELIVERY_EXTRA_TYPE_LABELS,
  DELIVERY_STATUS_LABELS,
} from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type { DeliveryStatus } from "@/server/deliveries/types";

import { FavoriteToggle } from "./favorite-toggle";

interface Result {
  motoboy: {
    id: string;
    name: string;
    favoriteId: string | null;
    ratingAverage: number | null;
    ratingCount: number;
    lastCompletedDeliveryId: string;
  };
  items: Array<{
    id: string;
    status: DeliveryStatus;
    createdAt: string;
    completedAt: string | null;
    pickupNeighborhood: string;
    destinationNeighborhood: string;
    offeredPrice: number;
    suggestedPrice: number | null;
    companyRating: number | null;
    extras: Array<{
      id: string;
      type: keyof typeof DELIVERY_EXTRA_TYPE_LABELS;
    }>;
  }>;
  pagination: { page: number; total: number; totalPages: number };
}

export function CompanyMotoboyRelationship({
  motoboyId,
}: {
  motoboyId: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/company/motoboys/${motoboyId}?page=${page}&pageSize=20`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar o relacionamento.",
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
  }, [motoboyId, page]);
  useEffect(() => {
    async function loadRelationship() {
      await load();
    }
    void loadRelationship();
  }, [load]);

  if (loading && !result)
    return (
      <Card className="p-6 text-sm text-muted">
        Carregando histórico conjunto...
      </Card>
    );
  if (error && !result)
    return (
      <Card className="p-6 text-sm font-semibold text-red-700">{error}</Card>
    );
  if (!result) return null;
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold">
              {result.motoboy.name}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {result.motoboy.ratingAverage === null
                ? "Sem avaliações"
                : `${result.motoboy.ratingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ★ (${result.motoboy.ratingCount} avaliações)`}{" "}
              · {result.pagination.total} entrega(s) em conjunto
            </p>
          </div>
          <FavoriteToggle
            initialFavoriteId={result.motoboy.favoriteId}
            completedDeliveryId={result.motoboy.lastCompletedDeliveryId}
            onChange={(favoriteId) =>
              setResult((current) =>
                current
                  ? { ...current, motoboy: { ...current.motoboy, favoriteId } }
                  : current,
              )
            }
          />
        </div>
      </Card>
      {result.items.map((delivery) => (
        <Card key={delivery.id} className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
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
              <p className="mt-3 font-bold">
                {delivery.pickupNeighborhood} →{" "}
                {delivery.destinationNeighborhood}
              </p>
              <p className="mt-2 text-sm text-muted">
                R${" "}
                {delivery.offeredPrice.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {delivery.companyRating === null
                  ? ""
                  : ` · Sua nota: ${delivery.companyRating} ★`}
                {delivery.suggestedPrice === null
                  ? ""
                  : ` · sugestão registrada: R$ ${delivery.suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
              {delivery.extras.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {delivery.extras.map((extra) => (
                    <Badge key={extra.id} variant="warning">
                      {DELIVERY_EXTRA_TYPE_LABELS[extra.type]}
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
                Detalhes
              </Link>
              <Link
                href={`/app/empresa/entregas/nova?repetir=${delivery.id}`}
                className={buttonStyles({ size: "sm" })}
              >
                Repetir
              </Link>
            </div>
          </div>
        </Card>
      ))}
      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">
            Página {page} de {result.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= result.pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
