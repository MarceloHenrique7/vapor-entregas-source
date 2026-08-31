"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DELIVERY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import type { DeliveryView } from "@/server/deliveries/types";
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

export function CompanyDeliveriesList() {
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
            "Não foi possível carregar as entregas.",
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
    async function loadInitialDeliveries() {
      await load();
    }

    void loadInitialDeliveries();
  }, [load]);
  useDeliveryEvents(load);

  if (!deliveries && !error) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (error)
    return (
      <Card className="p-6 text-sm font-semibold text-red-700">{error}</Card>
    );
  if (!deliveries?.length) {
    return (
      <Card>
        <EmptyState
          icon="package"
          title="Nenhuma entrega publicada"
          description="Crie uma oportunidade com coleta, destino, valor e forma de pagamento."
          action={
            <Link href="/app/empresa/entregas/nova" className={buttonStyles()}>
              Nova entrega
            </Link>
          }
        />
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => {
        const status =
          DELIVERY_STATUS_LABELS[
            delivery.status as keyof typeof DELIVERY_STATUS_LABELS
          ] ?? delivery.status;
        return (
          <Card key={delivery.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      delivery.status === "ACCEPTED" ? "success" : "info"
                    }
                  >
                    {status}
                  </Badge>
                  <span className="text-xs text-muted">
                    {date.format(new Date(delivery.createdAt))}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-xl font-extrabold">
                  {delivery.pickupNeighborhood} →{" "}
                  {delivery.destinationNeighborhood}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Destino: {delivery.destinationAddress},{" "}
                  {delivery.destinationNumber}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-light/55 px-5 py-4 text-left sm:text-right">
                <p className="font-display text-xl font-extrabold text-brand-dark">
                  {currency.format(delivery.offeredPrice)}
                </p>
                <p className="mt-1 text-xs font-bold text-muted">
                  {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}
                </p>
                {delivery.suggestedPrice !== null && (
                  <p className="mt-1 text-xs text-muted">
                    Sugestão: {currency.format(delivery.suggestedPrice)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <DeliveryExtrasSummary extras={delivery.extras} />
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs font-semibold text-muted">
              <span>
                {delivery.distanceEstimateKm.toFixed(1).replace(".", ",")} km em
                linha reta
              </span>
              <span>
                Expira às{" "}
                {new Date(delivery.expiresAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {delivery.status === "ACCEPTED" && (
                <span className="text-brand">Motoboy confirmado</span>
              )}
              <Link
                href={`/app/empresa/entregas/${delivery.id}`}
                className="ml-auto font-bold text-brand hover:text-brand-dark"
              >
                Ver acompanhamento →
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
