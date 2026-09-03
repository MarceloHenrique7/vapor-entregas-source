"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DIRECT_PAYMENT_NOTICE,
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

type RouteEstimate = {
  distanceKm: number;
  durationSeconds: number | null;
  method: "STRAIGHT_LINE" | "GOOGLE_ROUTES";
  isRoadDistance: boolean;
};

function compactRouteLabel(distanceKm: number, durationSeconds: number | null) {
  const distance = distanceKm.toFixed(1).replace(".", ",");
  return durationSeconds
    ? `${distance} km · ~${Math.max(1, Math.ceil(durationSeconds / 60))} min`
    : `${distance} km`;
}

function OpportunityRouteDetails({ delivery }: { delivery: DeliveryView }) {
  const container = useRef<HTMLDivElement>(null);
  const requested = useRef(false);
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const target = container.current;
    if (!target) return;

    const load = async () => {
      if (requested.current) return;
      requested.current = true;
      try {
        const response = await fetch(
          `/api/routes/opportunities/${delivery.id}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as { route?: RouteEstimate };
        if (response.ok && payload.route) setRoute(payload.route);
      } catch {
        // The straight-line estimate already present in the opportunity is safe fallback UI.
      } finally {
        setSettled(true);
      }
    };

    if (!("IntersectionObserver" in window)) {
      void load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [delivery.id]);

  const persistedRoadRoute = delivery.distanceMethod === "GOOGLE_ROUTES";
  const toPickupDistance =
    route?.distanceKm ?? delivery.distanceToPickupKm ?? null;
  const totalDistance =
    toPickupDistance === null
      ? null
      : toPickupDistance + delivery.distanceEstimateKm;

  return (
    <div
      ref={container}
      className="grid gap-3 sm:col-span-2 sm:grid-cols-3"
      aria-live="polite"
    >
      <div className="rounded-xl bg-white/75 p-3">
        <p className="text-xs font-bold text-muted">Até a coleta</p>
        <p className="mt-1 font-extrabold text-ink">
          {!settled
            ? "Calculando rota..."
            : route?.isRoadDistance
              ? compactRouteLabel(route.distanceKm, route.durationSeconds)
              : delivery.distanceToPickupKm == null
                ? "Distância aproximada indisponível"
                : `~${delivery.distanceToPickupKm.toFixed(1).replace(".", ",")} km em linha reta`}
        </p>
      </div>
      <div className="rounded-xl bg-white/75 p-3">
        <p className="text-xs font-bold text-muted">Coleta → destino</p>
        <p className="mt-1 font-extrabold text-ink">
          {persistedRoadRoute
            ? compactRouteLabel(
                delivery.distanceEstimateKm,
                delivery.routeDurationSeconds,
              )
            : `~${delivery.distanceEstimateKm.toFixed(1).replace(".", ",")} km em linha reta`}
        </p>
      </div>
      <div className="rounded-xl border border-brand/15 bg-brand-light/35 p-3">
        <p className="text-xs font-bold text-brand-dark">Total aproximado</p>
        <p className="mt-1 font-display text-lg font-extrabold text-brand-dark">
          {totalDistance === null
            ? "Calculando..."
            : `${totalDistance.toFixed(1).replace(".", ",")} km`}
        </p>
      </div>
    </div>
  );
}

export function MotoboyOpportunitiesList() {
  const [opportunities, setOpportunities] = useState<DeliveryView[] | null>(
    null,
  );
  const [error, setError] = useState<{
    text: string;
    offline?: boolean;
  } | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [acknowledgedExtras, setAcknowledgedExtras] = useState<Set<string>>(
    new Set(),
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/deliveries/opportunities", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        opportunities?: DeliveryView[];
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.opportunities) {
        setOpportunities([]);
        setError({
          text: apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar oportunidades.",
          ),
          offline: payload.code === "MOTOBOY_OFFLINE",
        });
        return;
      }
      setOpportunities(payload.opportunities);
      setError(null);
    } catch {
      setError({ text: CONNECTION_ERROR });
    }
  }, []);
  useEffect(() => {
    async function loadInitialOpportunities() {
      await load();
    }

    void loadInitialOpportunities();
  }, [load]);
  useDeliveryEvents(load);

  async function accept(id: string) {
    setAccepting(id);
    setError(null);
    setSuccess("");
    try {
      const response = await fetch(`/api/deliveries/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extrasAcknowledged: acknowledgedExtras.has(id),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError({
          text: apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível aceitar esta oportunidade.",
          ),
        });
        await load();
        return;
      }
      setSuccess("Oportunidade aceita. Ela agora está vinculada a você.");
      await load();
    } catch {
      setError({ text: CONNECTION_ERROR });
    } finally {
      setAccepting(null);
    }
  }

  if (!opportunities && !error) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  if (error?.offline) {
    return (
      <Card>
        <EmptyState
          icon="map"
          title="Você está offline"
          description={error.text}
          action={
            <Link href="/app/motoboy" className={buttonStyles()}>
              Controlar disponibilidade
            </Link>
          }
        />
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-light/55 p-4 text-sm leading-6 text-brand-dark">
        Você escolhe livremente aceitar ou ignorar qualquer oportunidade.
        Ignorar não gera punição, meta ou impacto na sua conta.
      </div>
      {success && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {success}{" "}
          <Link href="/app/motoboy/corrida" className="underline">
            Ver corrida atual
          </Link>
        </div>
      )}
      {error && (
        <div
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error.text}
        </div>
      )}
      {!opportunities?.length ? (
        <Card>
          <EmptyState
            icon="route"
            title="Nenhuma oportunidade próxima agora"
            description="Novas oportunidades compatíveis aparecerão aqui em tempo real enquanto sua presença estiver válida."
          />
        </Card>
      ) : (
        opportunities.map((delivery) => (
          <Card
            key={delivery.id}
            className="opportunity-card-attention overflow-hidden"
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="info" className="new-opportunity-badge">
                    NOVA
                  </Badge>
                  <h2 className="mt-3 font-display text-xl font-extrabold">
                    {delivery.companyName}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">
                    {delivery.pickupNeighborhood} →{" "}
                    {delivery.destinationNeighborhood}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {delivery.companyRatingAverage === null ||
                    delivery.companyRatingAverage === undefined
                      ? "Empresa ainda sem avaliações"
                      : `${delivery.companyRatingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ★ (${delivery.companyRatingCount ?? 0} avaliações)`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-extrabold text-brand">
                    {currency.format(delivery.offeredPrice)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}
                  </p>
                  {delivery.suggestedPrice !== null && (
                    <p className="mt-2 text-xs text-muted">
                      Sugestão registrada:{" "}
                      {currency.format(delivery.suggestedPrice)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 rounded-2xl bg-canvas p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-muted">Coleta</p>
                  <p className="mt-1 font-semibold">
                    {delivery.pickupAddress}, {delivery.pickupNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted">Destino</p>
                  <p className="mt-1 font-semibold">
                    {delivery.destinationAddress}, {delivery.destinationNumber}
                  </p>
                </div>
                <OpportunityRouteDetails delivery={delivery} />
              </div>
              {delivery.notes && (
                <p className="mt-4 text-sm leading-6 text-muted">
                  <strong className="text-ink">Observações:</strong>{" "}
                  {delivery.notes}
                </p>
              )}
              <div className="mt-4">
                <DeliveryExtrasSummary extras={delivery.extras} />
              </div>
              {!!delivery.extras?.some(
                (extra) => extra.status === "PENDING",
              ) && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-brand"
                    checked={acknowledgedExtras.has(delivery.id)}
                    onChange={(event) =>
                      setAcknowledgedExtras((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(delivery.id);
                        else next.delete(delivery.id);
                        return next;
                      })
                    }
                  />
                  <span>
                    Li e estou ciente das condições desta entrega. Continuo
                    livre para aceitar ou ignorar a oportunidade.
                  </span>
                </label>
              )}
              <p className="mt-4 text-xs leading-5 text-muted">
                {DIRECT_PAYMENT_NOTICE}
              </p>
            </div>
            <div className="border-t border-line bg-canvas/60 p-4 sm:flex sm:items-center sm:justify-between sm:px-6">
              <p className="mb-3 text-xs text-muted sm:mb-0">
                Aceite confirmado somente após resposta do servidor.
              </p>
              <Button
                className="primary-action-attention w-full sm:w-auto"
                onClick={() => accept(delivery.id)}
                disabled={
                  accepting !== null ||
                  (!!delivery.extras?.some(
                    (extra) => extra.status === "PENDING",
                  ) &&
                    !acknowledgedExtras.has(delivery.id))
                }
              >
                <Icon name="check" className="size-5" />
                {accepting === delivery.id
                  ? "Confirmando..."
                  : "Aceitar entrega"}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
