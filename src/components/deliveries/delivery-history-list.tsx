"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DELIVERY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import type { DeliveryStatus, DeliveryView } from "@/server/deliveries/types";
import { RatingDialog } from "@/components/reputation/rating-dialog";
import { ReportDialog } from "@/components/reputation/report-dialog";
import type { FavoriteView, RatingOverview } from "@/server/reputation/types";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

import { useDeliveryEvents } from "./use-delivery-events";
import { DeliveryExtrasSummary } from "./delivery-extras-summary";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function DeliveryHistoryList({
  actorRole,
}: {
  actorRole: "COMPANY" | "MOTOBOY";
}) {
  const [deliveries, setDeliveries] = useState<DeliveryView[] | null>(null);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<RatingOverview | null>(null);
  const [favorites, setFavorites] = useState<FavoriteView[]>([]);
  const [ratingDelivery, setRatingDelivery] = useState<DeliveryView | null>(
    null,
  );
  const [reportDelivery, setReportDelivery] = useState<DeliveryView | null>(
    null,
  );
  const [busyFavorite, setBusyFavorite] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (from) search.set("from", from);
    if (to) search.set("to", to);
    try {
      const response = await fetch(`/api/deliveries/history?${search}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        deliveries?: DeliveryView[];
        error?: string;
      };
      if (!response.ok || !payload.deliveries) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar o histórico.",
          ),
        );
        return;
      }
      setDeliveries(payload.deliveries);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    }
  }, [from, status, to]);

  const loadReputation = useCallback(async () => {
    try {
      const ratingResponse = await fetch("/api/ratings", { cache: "no-store" });
      if (ratingResponse.ok) {
        setOverview((await ratingResponse.json()) as RatingOverview);
      }
      if (actorRole === "COMPANY") {
        const favoriteResponse = await fetch("/api/favorites", {
          cache: "no-store",
        });
        if (favoriteResponse.ok) {
          const payload = (await favoriteResponse.json()) as {
            favorites: FavoriteView[];
          };
          setFavorites(payload.favorites);
        }
      }
    } catch {
      // Delivery history remains usable if the auxiliary reputation data fails.
    }
  }, [actorRole]);

  useEffect(() => {
    async function loadInitialHistory() {
      await Promise.all([load(), loadReputation()]);
    }
    void loadInitialHistory();
  }, [load, loadReputation]);
  useDeliveryEvents(load);

  async function toggleFavorite(delivery: DeliveryView) {
    const existing = favorites.find(
      (favorite) => favorite.motoboyId === delivery.motoboyId,
    );
    setBusyFavorite(delivery.id);
    setError("");
    try {
      const response = existing
        ? await fetch(`/api/favorites/${existing.id}`, { method: "DELETE" })
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deliveryId: delivery.id }),
          });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível atualizar os favoritos.",
          ),
        );
        return;
      }
      setSuccess(
        existing
          ? "Motoboy removido dos favoritos."
          : "Motoboy adicionado aos favoritos.",
      );
      await loadReputation();
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusyFavorite(null);
    }
  }

  return (
    <div className="space-y-6">
      {success && (
        <p
          className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
          role="status"
        >
          {success}
        </p>
      )}
      <Card className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <FormField label="Status" htmlFor="history-status">
          <Select
            id="history-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Concluídas e canceladas</option>
            {(
              [
                "COMPLETED",
                "CANCELLED_BY_COMPANY",
                "CANCELLED_BY_MOTOBOY",
              ] as DeliveryStatus[]
            ).map((value) => (
              <option key={value} value={value}>
                {DELIVERY_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Data inicial" htmlFor="history-from">
          <Input
            id="history-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </FormField>
        <FormField label="Data final" htmlFor="history-to">
          <Input
            id="history-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </FormField>
      </Card>

      {error && (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      )}
      {!deliveries && !error && (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      )}
      {deliveries?.length === 0 && (
        <Card>
          <EmptyState
            icon="history"
            title="Nenhuma entrega no período"
            description="Entregas concluídas e canceladas aparecerão aqui sem dados privados ou informações financeiras."
          />
        </Card>
      )}
      {deliveries?.map((delivery) => {
        const counterparty = overview?.counterparties[delivery.id];
        const alreadyRated = overview?.given.some(
          (rating) => rating.deliveryId === delivery.id,
        );
        const favorite = favorites.find(
          (item) => item.motoboyId === delivery.motoboyId,
        );
        return (
          <Card key={delivery.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      delivery.status === "COMPLETED" ? "success" : "neutral"
                    }
                  >
                    {DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                  <span className="text-xs text-muted">
                    {date.format(
                      new Date(
                        delivery.completedAt ??
                          delivery.cancelledAt ??
                          delivery.createdAt,
                      ),
                    )}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-extrabold">
                  {delivery.pickupNeighborhood} →{" "}
                  {delivery.destinationNeighborhood}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {actorRole === "COMPANY"
                    ? `Motoboy: ${delivery.motoboyName ?? "Não vinculado"}`
                    : delivery.companyName}
                </p>
                {counterparty && (
                  <p className="mt-2 text-sm font-semibold text-ink-soft">
                    {counterparty.average === null
                      ? "Ainda sem avaliações"
                      : `${counterparty.average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★ (${counterparty.count} avaliações)`}
                  </p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="font-display text-xl font-extrabold text-brand">
                  {currency.format(delivery.offeredPrice)}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Valor informado ·{" "}
                  {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}
                </p>
                {delivery.suggestedPrice !== null && (
                  <p className="mt-1 text-xs text-muted">
                    Sugestão registrada:{" "}
                    {currency.format(delivery.suggestedPrice)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {delivery.status === "COMPLETED" &&
                !alreadyRated &&
                counterparty && (
                  <Button size="sm" onClick={() => setRatingDelivery(delivery)}>
                    Avaliar {actorRole === "COMPANY" ? "motoboy" : "empresa"}
                  </Button>
                )}
              {delivery.status === "COMPLETED" && alreadyRated && (
                <Badge variant="success">Avaliação enviada</Badge>
              )}
              {actorRole === "COMPANY" &&
                delivery.status === "COMPLETED" &&
                delivery.motoboyId && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyFavorite === delivery.id}
                    onClick={() => toggleFavorite(delivery)}
                  >
                    {busyFavorite === delivery.id
                      ? "Atualizando..."
                      : favorite
                        ? "Remover dos favoritos"
                        : "Favoritar motoboy"}
                  </Button>
                )}
              <Button
                size="sm"
                variant="danger"
                onClick={() => setReportDelivery(delivery)}
              >
                Denunciar problema
              </Button>
              {actorRole === "COMPANY" && (
                <Link
                  href={`/app/empresa/entregas/${delivery.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  Ver acompanhamento
                </Link>
              )}
            </div>
            <div className="mt-4">
              <DeliveryExtrasSummary extras={delivery.extras} />
            </div>
          </Card>
        );
      })}
      {ratingDelivery && overview?.counterparties[ratingDelivery.id] && (
        <RatingDialog
          open
          deliveryId={ratingDelivery.id}
          reviewedName={overview.counterparties[ratingDelivery.id].name}
          onClose={() => setRatingDelivery(null)}
          onSuccess={() => {
            setSuccess("Avaliação enviada com sucesso.");
            void loadReputation();
          }}
        />
      )}
      {reportDelivery && (
        <ReportDialog
          open
          deliveryId={reportDelivery.id}
          onClose={() => setReportDelivery(null)}
          onSuccess={() => setSuccess("Denúncia registrada com sucesso.")}
        />
      )}
    </div>
  );
}
