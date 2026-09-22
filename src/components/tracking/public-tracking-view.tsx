"use client";

import { useCallback, useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DELIVERY_STATUS_LABELS } from "@/config/delivery";
import { TRACKING_PUBLIC_POLL_INTERVAL_MS } from "@/config/tracking";
import type { PublicTrackingView as PublicTrackingData } from "@/server/tracking/types";

import { PublicTrackingMapLoader } from "./public-tracking-map-loader";

const cityLabels = {
  PETROLINA_PE: "Petrolina",
  JUAZEIRO_BA: "Juazeiro",
} as const;

const stateCopy = {
  WAITING: {
    title: "A entrega está sendo preparada",
    description:
      "O acompanhamento aparecerá quando o motoboy iniciar o trajeto até você.",
  },
  LIVE: {
    title: "Seu pedido está a caminho 🛵",
    description: "A posição abaixo foi recebida recentemente pela Vapor.",
  },
  STALE: {
    title: "A entrega continua em andamento",
    description:
      "A última posição está desatualizada. O motoboy pode estar sem sinal ou com a Vapor fechada.",
  },
  COMPLETED: {
    title: "Entrega concluída",
    description: "O rastreamento de localização foi encerrado.",
  },
  CANCELLED: {
    title: "Entrega cancelada",
    description: "O rastreamento de localização foi encerrado.",
  },
} as const;

function relativeUpdate(value: string, now: number) {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 1_000),
  );
  if (seconds < 10) return "Atualizado agora";
  if (seconds < 60) return `Atualizado há ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  return `Atualizado há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function PublicTrackingView({ token }: { token: string }) {
  const [tracking, setTracking] = useState<PublicTrackingData | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tracking/${token}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        tracking?: PublicTrackingData;
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.tracking) {
        setExpired(response.status === 410);
        setError(
          payload.error ?? "Não foi possível carregar este acompanhamento.",
        );
        return;
      }
      setTracking(payload.tracking);
      setError("");
      setExpired(false);
      setClock(Date.now());
    } catch {
      setError("Sem conexão. Tentaremos atualizar novamente em instantes.");
    }
  }, [token]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const polling = window.setInterval(load, TRACKING_PUBLIC_POLL_INTERVAL_MS);
    const ticking = window.setInterval(() => setClock(Date.now()), 5_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(polling);
      window.clearInterval(ticking);
    };
  }, [load]);

  const terminal =
    tracking?.state === "COMPLETED" || tracking?.state === "CANCELLED";

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <Badge variant="neutral">Acompanhamento seguro</Badge>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        {!tracking && !error && (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-[24rem] w-full" />
          </>
        )}

        {error && !tracking && (
          <Card className="p-8 text-center sm:p-12">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-light text-3xl">
              {expired ? "⌛" : "🔒"}
            </span>
            <h1 className="mt-5 font-display text-2xl font-extrabold">
              {expired ? "Link expirado" : "Acompanhamento indisponível"}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
              {error}
            </p>
          </Card>
        )}

        {tracking && (
          <>
            <Card className="overflow-hidden">
              <div className="bg-brand p-6 text-white sm:p-8">
                <Badge className="bg-white/15 text-white">
                  {DELIVERY_STATUS_LABELS[tracking.deliveryStatus]}
                </Badge>
                <h1 className="mt-4 text-balance font-display text-3xl font-extrabold sm:text-4xl">
                  {stateCopy[tracking.state].title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                  {stateCopy[tracking.state].description}
                </p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Empresa
                  </p>
                  <p className="mt-2 font-bold">{tracking.companyName}</p>
                </div>
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Destino
                  </p>
                  <p className="mt-2 font-bold">
                    {tracking.destination
                      ? `${tracking.destination.neighborhood} · ${cityLabels[tracking.destination.city]}/${tracking.destination.state}`
                      : terminal
                        ? "Localização encerrada"
                        : "Exibido quando a entrega iniciar"}
                  </p>
                </div>
              </div>
            </Card>

            {tracking.location && !terminal ? (
              <Card className="overflow-hidden">
                <div className="h-[22rem] sm:h-[30rem]">
                  <PublicTrackingMapLoader
                    courier={tracking.location}
                    destination={tracking.destination}
                  />
                </div>
                <div className="border-t border-line p-4 text-sm sm:flex sm:items-center sm:justify-between sm:px-6">
                  <p className="font-bold">
                    {relativeUpdate(tracking.location.updatedAt, clock)}
                  </p>
                  <p className="mt-1 text-xs text-muted sm:mt-0">
                    Precisão informada pelo aparelho: aproximadamente{" "}
                    {Math.round(tracking.location.accuracyMeters ?? 0)} m
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center sm:p-10">
                <span className="text-4xl" aria-hidden="true">
                  {terminal ? "✓" : "🛵"}
                </span>
                <p className="mt-4 font-display text-xl font-extrabold">
                  {terminal
                    ? "O compartilhamento de GPS foi encerrado"
                    : "Aguardando localização do entregador"}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
                  A tela se atualiza automaticamente. Não é necessário instalar
                  aplicativo nem recarregar a página.
                </p>
              </Card>
            )}
          </>
        )}
        <p className="px-3 text-center text-xs leading-5 text-muted">
          A Vapor mostra somente os dados necessários para esta entrega. O link
          é temporário e a localização não é usada pelo Meta Pixel.
        </p>
      </div>
    </main>
  );
}
