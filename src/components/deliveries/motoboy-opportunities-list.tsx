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
  DELIVERY_EXTRA_TYPE_LABELS,
  DIRECT_PAYMENT_NOTICE,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import type { DeliveryOpportunityView } from "@/server/deliveries/types";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

import { useDeliveryEvents } from "./use-delivery-events";

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

function OpportunityRouteDetails({
  delivery,
}: {
  delivery: DeliveryOpportunityView;
}) {
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
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
      aria-live="polite"
    >
      <p className="inline-flex items-center gap-2 font-semibold text-ink-soft">
        <Icon name="map-pin" className="size-4 text-brand" />
        <span>
          Até a coleta:{" "}
          {!settled
            ? "Calculando rota..."
            : route?.isRoadDistance
              ? compactRouteLabel(route.distanceKm, route.durationSeconds)
              : delivery.distanceToPickupKm == null
                ? "Distância aproximada indisponível"
                : `~${delivery.distanceToPickupKm.toFixed(1).replace(".", ",")} km em linha reta`}
        </span>
      </p>
      <p className="inline-flex items-center gap-2 font-semibold text-ink-soft">
        <Icon name="route" className="size-4 text-brand" />
        <span>
          Corrida:{" "}
          {persistedRoadRoute
            ? compactRouteLabel(
                delivery.distanceEstimateKm,
                delivery.routeDurationSeconds,
              )
            : `~${delivery.distanceEstimateKm.toFixed(1).replace(".", ",")} km em linha reta`}
        </span>
      </p>
      {totalDistance !== null && (
        <p className="font-bold text-brand-dark">
          Total aproximado: {totalDistance.toFixed(1).replace(".", ",")} km
        </p>
      )}
    </div>
  );
}

export function MotoboyOpportunitiesList() {
  const [opportunities, setOpportunities] = useState<
    DeliveryOpportunityView[] | null
  >(null);
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
        opportunities?: DeliveryOpportunityView[];
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
          <Skeleton key={index} className="h-72 w-full" />
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
            title="Nenhuma oportunidade disponível agora"
            description="Novas entregas aparecerão aqui quando forem publicadas."
          />
        </Card>
      ) : (
        opportunities.map((delivery) => (
          <Card
            key={delivery.id}
            className="opportunity-card-attention overflow-hidden"
          >
            <article className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="info" className="new-opportunity-badge">
                    Nova oportunidade
                  </Badge>
                  <h2 className="mt-3 truncate font-display text-xl font-extrabold">
                    {delivery.companyName}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {delivery.companyRatingAverage === null
                      ? "Empresa ainda sem avaliações"
                      : `${delivery.companyRatingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ★ · ${delivery.companyRatingCount} avaliação(ões)`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl font-extrabold text-brand sm:text-3xl">
                    {currency.format(delivery.offeredPrice)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    valor da corrida
                  </p>
                </div>
              </div>

              <div className="mt-5 border-l-2 border-brand/20 pl-4">
                <div className="relative pb-5">
                  <span className="absolute -left-[1.35rem] top-0.5 size-3 rounded-full border-2 border-white bg-brand" />
                  <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-muted">
                    Coleta
                  </p>
                  <p className="mt-1 font-bold text-ink">
                    {delivery.pickupAddress} · {delivery.pickupNeighborhood}
                  </p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[1.35rem] top-0.5 size-3 rounded-full border-2 border-white bg-ink" />
                  <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-muted">
                    Entrega
                  </p>
                  <p className="mt-1 font-bold text-ink">
                    {delivery.destinationNeighborhood}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    O endereço exato é exibido após o aceite.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-y border-line py-3">
                <OpportunityRouteDetails delivery={delivery} />
              </div>

              {delivery.extras.length > 0 && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-amber-900">
                    Condição especial
                  </p>
                  <ul className="mt-2 space-y-1 text-sm font-semibold text-amber-950">
                    {delivery.extras.map((extra) => (
                      <li key={extra.id}>
                        {DELIVERY_EXTRA_TYPE_LABELS[extra.type]}:{" "}
                        {extra.description}
                        {extra.amount === null
                          ? ""
                          : ` · ${currency.format(extra.amount)}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
              <details className="mt-4 text-xs text-muted">
                <summary className="cursor-pointer font-bold text-ink-soft">
                  Pagamento e transparência
                </summary>
                <p className="mt-2 leading-5">
                  {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}.{" "}
                  {DIRECT_PAYMENT_NOTICE}
                </p>
              </details>

              <Button
                className="primary-action-attention mt-5 w-full"
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
              <p className="mt-3 text-center text-xs text-muted">
                O aceite só é concluído após confirmação do servidor.
              </p>
            </article>
          </Card>
        ))
      )}
    </div>
  );
}
