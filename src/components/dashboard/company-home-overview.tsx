"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryEvents } from "@/components/deliveries/use-delivery-events";
import { DELIVERY_STATUS_LABELS } from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type { DeliveryView } from "@/server/deliveries/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const activeStatuses = new Set([
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
]);

export function CompanyHomeOverview() {
  const [deliveries, setDeliveries] = useState<DeliveryView[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/deliveries", { cache: "no-store" });
      const payload = (await response.json()) as {
        deliveries?: DeliveryView[];
        error?: string;
      };
      if (!response.ok || !payload.deliveries) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar o resumo da operação.",
          ),
        );
        return;
      }
      setDeliveries(payload.deliveries);
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
  useDeliveryEvents(load);

  if (!deliveries && !error) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (error) {
    return (
      <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
        {error}
      </Card>
    );
  }

  if (!deliveries?.length) {
    return (
      <Card>
        <EmptyState
          icon="package"
          title="Você ainda não publicou nenhuma entrega"
          description="Crie sua primeira oportunidade para encontrar um motoboy disponível."
          action={
            <Link href="/app/empresa/entregas/nova" className={buttonStyles()}>
              Criar primeira entrega
            </Link>
          }
        />
      </Card>
    );
  }

  const waiting = deliveries.filter(
    (delivery) => delivery.status === "SEARCHING_MOTOBOY",
  ).length;
  const active = deliveries.filter((delivery) =>
    activeStatuses.has(delivery.status),
  ).length;
  const attention = deliveries.filter(
    (delivery) => delivery.paymentStatus === "DISPUTED",
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted">Aguardando motoboy</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{waiting}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted">Em andamento</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{active}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted">Pendências</p>
          <p className="mt-2 font-display text-3xl font-extrabold">
            {attention}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-extrabold">
            Entregas recentes
          </h2>
          <Link
            href="/app/empresa/entregas"
            className="text-sm font-bold text-brand"
          >
            Ver todas
          </Link>
        </div>
        <div className="divide-y divide-line">
          {deliveries.slice(0, 3).map((delivery) => (
            <Link
              key={delivery.id}
              href={`/app/empresa/entregas/${delivery.id}`}
              className="flex flex-col gap-3 px-5 py-4 transition hover:bg-canvas/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {delivery.pickupNeighborhood} →{" "}
                  {delivery.destinationNeighborhood}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {delivery.motoboyName ?? "Aguardando motoboy"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Badge
                  variant={
                    delivery.status === "COMPLETED" ? "success" : "neutral"
                  }
                >
                  {DELIVERY_STATUS_LABELS[delivery.status]}
                </Badge>
                <strong className="text-brand">
                  {currency.format(delivery.offeredPrice)}
                </strong>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
