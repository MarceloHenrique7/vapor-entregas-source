"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_EXTRA_STATUS_LABELS,
  DELIVERY_EXTRA_TYPE_LABELS,
  DIRECT_PAYMENT_NOTICE,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import type {
  DeliveryStatus,
  DeliveryStatusHistoryView,
  DeliveryExtraView,
  DeliveryView,
} from "@/server/deliveries/types";

import { useDeliveryEvents } from "./use-delivery-events";
import { DeliveryExtrasPanel } from "./delivery-extras-panel";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const nextAction: Partial<
  Record<DeliveryStatus, { status: DeliveryStatus; label: string }>
> = {
  ACCEPTED: {
    status: "MOTOBOY_TO_PICKUP",
    label: "Iniciar deslocamento para coleta",
  },
  MOTOBOY_TO_PICKUP: {
    status: "ARRIVED_AT_PICKUP",
    label: "Cheguei na coleta",
  },
  ARRIVED_AT_PICKUP: { status: "PICKED_UP", label: "Pedido coletado" },
  PICKED_UP: { status: "IN_DELIVERY", label: "Iniciar entrega" },
  IN_DELIVERY: { status: "COMPLETED", label: "Finalizar entrega" },
};

const companyCancellable: DeliveryStatus[] = [
  "SEARCHING_MOTOBOY",
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];
const motoboyCancellable: DeliveryStatus[] = [
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];

function NavigationButtons({
  links,
}: {
  links?: { googleMaps: string; waze: string };
}) {
  if (!links) return null;
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <a
        href={links.googleMaps}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ variant: "outline", size: "sm" })}
      >
        <Icon name="map" className="size-4" /> Abrir no Google Maps
      </a>
      <a
        href={links.waze}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ variant: "outline", size: "sm" })}
      >
        <Icon name="route" className="size-4" /> Abrir no Waze
      </a>
    </div>
  );
}

function Timeline({
  history,
  extras,
}: {
  history: DeliveryStatusHistoryView[];
  extras: DeliveryExtraView[];
}) {
  const events = [
    ...history.map((item) => ({
      id: item.id,
      title: DELIVERY_STATUS_LABELS[item.newStatus],
      actorRole: item.actorRole,
      note: item.note,
      createdAt: item.createdAt,
    })),
    ...extras.flatMap((extra) =>
      extra.history.map((item) => ({
        id: `${extra.id}-${item.id}`,
        title: `${DELIVERY_EXTRA_TYPE_LABELS[extra.type]} · ${DELIVERY_EXTRA_STATUS_LABELS[item.newStatus]}`,
        actorRole: item.actorRole,
        note: item.note,
        createdAt: item.createdAt,
      })),
    ),
  ].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  return (
    <ol className="space-y-0" aria-label="Histórico de status">
      {events.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          {index < events.length - 1 && (
            <span className="absolute left-[.69rem] top-6 h-[calc(100%-1rem)] w-px bg-line" />
          )}
          <span className="relative mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white">
            <Icon name="check" className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-xs text-muted">
              {dateTime.format(new Date(item.createdAt))}
              {item.actorRole ? ` · ${item.actorRole}` : ""}
            </p>
            {item.note && (
              <p className="mt-1 text-sm leading-5 text-ink-soft">
                {item.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DeliveryDetailCard({
  endpoint,
  actorRole,
}: {
  endpoint: string;
  actorRole: "COMPANY" | "MOTOBOY";
}) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryView | null | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as {
        delivery?: DeliveryView | null;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível carregar a entrega.");
        return;
      }
      setDelivery(payload.delivery ?? null);
      setError("");
    } catch {
      setError("Erro de rede ao carregar a entrega.");
    }
  }, [endpoint]);

  useEffect(() => {
    async function loadInitialDelivery() {
      await load();
    }
    void loadInitialDelivery();
  }, [load]);
  useDeliveryEvents(load);

  async function mutate(path: "status" | "cancel", body: object) {
    if (!delivery) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/${path}`, {
        method: path === "status" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        delivery?: DeliveryView;
        error?: string;
      };
      if (!response.ok || !payload.delivery) {
        setError(payload.error ?? "Não foi possível atualizar a entrega.");
        await load();
        return;
      }
      setDelivery(payload.delivery);
      setCancelOpen(false);
      setReason("");
      if (
        actorRole === "MOTOBOY" &&
        ["COMPLETED", "CANCELLED_BY_COMPANY", "CANCELLED_BY_MOTOBOY"].includes(
          payload.delivery.status,
        )
      ) {
        router.push("/app/motoboy/historico");
        router.refresh();
      }
    } catch {
      setError("Erro de rede. Confira sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (delivery === undefined && !error)
    return <Skeleton className="h-[42rem] w-full" />;
  if (error && !delivery)
    return (
      <Card className="p-6 text-sm font-semibold text-red-700">{error}</Card>
    );
  if (!delivery) {
    return (
      <Card>
        <EmptyState
          icon="route"
          title="Nenhuma corrida atual"
          description="Quando você aceitar uma oportunidade, o fluxo operacional aparecerá aqui."
          action={
            actorRole === "MOTOBOY" ? (
              <Link
                href="/app/motoboy/oportunidades"
                className={buttonStyles()}
              >
                Ver oportunidades
              </Link>
            ) : undefined
          }
        />
      </Card>
    );
  }

  const action = actorRole === "MOTOBOY" ? nextAction[delivery.status] : null;
  const canCancel =
    actorRole === "COMPANY"
      ? companyCancellable.includes(delivery.status)
      : motoboyCancellable.includes(delivery.status);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.75fr)]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-brand p-5 text-white sm:p-7">
            <Badge className="bg-white/15 text-white">
              {DELIVERY_STATUS_LABELS[delivery.status]}
            </Badge>
            <h2 className="mt-4 font-display text-2xl font-extrabold">
              {delivery.companyName}
            </h2>
            {delivery.motoboyName && (
              <p className="mt-2 text-sm text-white/80">
                Motoboy responsável:{" "}
                <strong className="text-white">{delivery.motoboyName}</strong>
              </p>
            )}
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
            <section className="rounded-2xl bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Coleta
              </p>
              <p className="mt-2 font-bold">
                {delivery.pickupAddress}, {delivery.pickupNumber}
              </p>
              <p className="mt-1 text-sm text-muted">
                {delivery.pickupNeighborhood} · {delivery.pickupState}
              </p>
              <NavigationButtons links={delivery.pickupNavigation} />
            </section>
            <section className="rounded-2xl bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Destino
              </p>
              <p className="mt-2 font-bold">
                {delivery.destinationAddress}, {delivery.destinationNumber}
              </p>
              <p className="mt-1 text-sm text-muted">
                {delivery.destinationNeighborhood} · {delivery.destinationState}
              </p>
              <NavigationButtons links={delivery.destinationNavigation} />
            </section>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Distância estimada
              </p>
              <p className="mt-2 font-bold">
                {delivery.distanceEstimateKm.toFixed(1).replace(".", ",")} km
                {delivery.routeDurationSeconds
                  ? ` · ~${Math.max(1, Math.ceil(delivery.routeDurationSeconds / 60))} min`
                  : " em linha reta"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {delivery.distanceMethod === "GOOGLE_ROUTES"
                  ? "Estimativa pela rota viária calculada."
                  : "Estimativa geográfica, não distância viária."}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Valor e pagamento direto
              </p>
              <p className="mt-2 font-display text-xl font-extrabold text-brand">
                {currency.format(delivery.offeredPrice)}
              </p>
              <p className="text-sm text-muted">
                {PAYMENT_METHOD_LABELS[delivery.paymentMethod]}
              </p>
              {delivery.suggestedPrice !== null && (
                <p className="mt-1 text-xs text-muted">
                  Sugestão registrada:{" "}
                  {currency.format(delivery.suggestedPrice)}
                </p>
              )}
            </div>
            {delivery.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Observações
                </p>
                <p className="mt-2 text-sm leading-6">{delivery.notes}</p>
              </div>
            )}
          </div>
          <p className="border-t border-line p-5 text-xs leading-5 text-muted sm:px-7">
            {DIRECT_PAYMENT_NOTICE}
          </p>
        </Card>

        {(action || canCancel || error) && (
          <Card className="p-5 sm:p-6">
            {error && (
              <p
                className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              {action && (
                <Button
                  className="min-h-14 flex-1"
                  disabled={busy}
                  onClick={() => mutate("status", { status: action.status })}
                >
                  <Icon name="arrow-right" className="size-5" />
                  {busy ? "Atualizando..." : action.label}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  className="min-h-14"
                  disabled={busy}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar entrega
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Todas as mudanças são confirmadas e registradas pelo servidor.
            </p>
          </Card>
        )}
        <DeliveryExtrasPanel
          deliveryId={delivery.id}
          deliveryStatus={delivery.status}
          extras={delivery.extras}
          actorRole={actorRole}
          onChanged={load}
        />
      </div>

      <Card className="h-fit p-5 sm:p-6">
        <h3 className="font-display text-xl font-extrabold">Acompanhamento</h3>
        <p className="mt-1 text-sm text-muted">
          Horários registrados pelo servidor.
        </p>
        <div className="mt-6">
          <Timeline
            history={delivery.history ?? []}
            extras={delivery.extras ?? []}
          />
        </div>
      </Card>

      <Dialog
        open={cancelOpen}
        onClose={() => !busy && setCancelOpen(false)}
        title="Cancelar esta entrega?"
        description="Não há punição automática. O cancelamento ficará registrado para análise futura."
      >
        <div className="space-y-5">
          <FormField
            label="Motivo opcional"
            htmlFor="cancel-reason"
            hint="Não informe CPF, RG ou outros dados privados."
          >
            <textarea
              id="cancel-reason"
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-28 w-full resize-y rounded-2xl border border-line bg-white p-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setCancelOpen(false)}
            >
              Manter entrega
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => mutate("cancel", { reason })}
            >
              {busy ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
