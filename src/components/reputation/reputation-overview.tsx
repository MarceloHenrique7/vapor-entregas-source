"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { RatingOverview } from "@/server/reputation/types";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

import { RatingDialog } from "./rating-dialog";

export function ReputationOverview() {
  const [overview, setOverview] = useState<RatingOverview | null>(null);
  const [selected, setSelected] = useState<{
    deliveryId: string;
    reviewedName: string;
  } | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ratings", { cache: "no-store" });
      const payload = (await response.json()) as RatingOverview & {
        error?: string;
      };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar as avaliações.",
          ),
        );
        return;
      }
      setOverview(payload);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    }
  }, []);

  useEffect(() => {
    async function loadInitialOverview() {
      await load();
    }
    void loadInitialOverview();
  }, [load]);

  if (!overview && !error) return <Skeleton className="h-64 w-full" />;
  if (!overview)
    return (
      <Card className="p-5 text-sm font-semibold text-red-700">{error}</Card>
    );

  return (
    <div className="space-y-5">
      {success && (
        <p
          className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
          role="status"
        >
          {success}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand">
            Avaliações recebidas
          </p>
          <p className="mt-3 font-display text-4xl font-extrabold">
            {overview.received.average === null
              ? "—"
              : overview.received.average.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
            <span className="ml-2 text-2xl text-sun">★</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {overview.received.count}{" "}
            {overview.received.count === 1 ? "avaliação" : "avaliações"}
          </p>
          <p className="mt-4 text-xs leading-5 text-muted">
            As avaliações ficam visíveis somente para você e para a moderação;
            não são publicadas para outros usuários.
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold">
            Entregas aguardando avaliação
          </h2>
          {overview.pending.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="star"
                title="Tudo avaliado"
                description="Novas entregas concluídas aparecerão aqui."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {overview.pending.slice(0, 5).map((item) => (
                <div
                  key={item.deliveryId}
                  className="flex flex-col gap-3 rounded-2xl bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold">{item.reviewedName}</p>
                    <p className="mt-1 text-xs text-muted">Entrega concluída</p>
                  </div>
                  <Button size="sm" onClick={() => setSelected(item)}>
                    Avaliar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-extrabold">
          O que disseram sobre você
        </h2>
        <p className="mt-1 text-sm text-muted">
          Nome público, nota, comentário e entrega relacionada.
        </p>
        {overview.receivedItems.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            Você ainda não recebeu avaliações.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {overview.receivedItems.map((rating) => (
              <article
                key={rating.id}
                className="rounded-2xl border border-line p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{rating.reviewerName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                      }).format(new Date(rating.createdAt))}
                      {` · Entrega ${rating.deliveryId.slice(0, 8)}`}
                    </p>
                  </div>
                  <Badge variant="warning">{rating.score} ★</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {rating.comment || "Sem comentário."}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-extrabold">Minha avaliação</h2>
        <p className="mt-1 text-sm text-muted">
          Avaliações enviadas, visíveis apenas à pessoa avaliada e à moderação.
        </p>
        {overview.given.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            Você ainda não enviou avaliações.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {overview.given.slice(0, 10).map((rating) => (
              <div
                key={rating.id}
                className="rounded-2xl border border-line p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{rating.reviewedName}</p>
                  <Badge variant="warning">{rating.score} ★</Badge>
                </div>
                {rating.comment && (
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    {rating.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <RatingDialog
          open
          deliveryId={selected.deliveryId}
          reviewedName={selected.reviewedName}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSuccess("Avaliação enviada com sucesso.");
            void load();
          }}
        />
      )}
    </div>
  );
}
