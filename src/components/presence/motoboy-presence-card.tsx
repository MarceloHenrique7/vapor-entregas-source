"use client";

import Link from "next/link";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MOTOBOY_AUTONOMY_NOTICE,
  PRESENCE_LOCATION_DISCLOSURE,
} from "@/config/presence";

import { useMotoboyPresence } from "./motoboy-presence-provider";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const permissionLabels = {
  unknown: "Ainda não consultada",
  prompt: "Aguardando sua escolha",
  granted: "Permitida neste navegador",
  denied: "Bloqueada no navegador",
  unsupported: "Navegador sem suporte",
};

function formatTime(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function MotoboyPresenceCard() {
  const {
    presence,
    permission,
    operation,
    tracking,
    feedback,
    goOnline,
    goOffline,
  } = useMotoboyPresence();
  const online = Boolean(presence?.isOnline);

  return (
    <Card className="overflow-hidden border-brand/15">
      <div
        className={
          online
            ? "bg-brand px-5 py-6 text-white sm:px-7"
            : "bg-ink px-5 py-6 text-white sm:px-7"
        }
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/65">
              Sua disponibilidade
            </p>
            {operation === "loading" ? (
              <Skeleton className="mt-3 h-9 w-52 bg-white/20" />
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={
                    online
                      ? "relative flex size-3"
                      : "size-3 rounded-full bg-white/35"
                  }
                  aria-hidden="true"
                >
                  {online && (
                    <>
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-200 opacity-70" />
                      <span className="relative inline-flex size-3 rounded-full bg-emerald-200" />
                    </>
                  )}
                </span>
                <h2 className="font-display text-2xl font-extrabold">
                  {online ? "Você está online" : "Você está offline"}
                </h2>
              </div>
            )}
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
              {online
                ? tracking
                  ? "Sua localização está sendo utilizada para encontrar oportunidades próximas."
                  : "Sua presença recente está online, mas a localização não está ativa neste dispositivo."
                : "Fique online para receber oportunidades de entrega próximas."}
            </p>
          </div>
          <Button
            size="lg"
            variant={online ? "secondary" : "primary"}
            className={
              online
                ? "w-full bg-white text-ink hover:bg-white/90 sm:w-auto"
                : "w-full bg-brand hover:bg-brand/90 sm:w-auto"
            }
            onClick={online ? goOffline : goOnline}
            disabled={operation !== "idle"}
          >
            <Icon name={online ? "x" : "map"} className="size-5" />
            {operation === "activating"
              ? "Obtendo localização..."
              : operation === "deactivating"
                ? "Ficando offline..."
                : online
                  ? "Ficar offline"
                  : permission === "denied"
                    ? "Tentar novamente"
                    : "Ficar online"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">
            Online desde
          </p>
          <p className="mt-2 text-sm font-bold text-ink">
            {online ? formatTime(presence?.onlineSince ?? null) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">
            Permissão
          </p>
          <p className="mt-2 text-sm font-bold text-ink">
            {permissionLabels[permission]}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">
            Última atualização
          </p>
          <p className="mt-2 text-sm font-bold text-ink">
            {formatTime(presence?.lastLocationAt ?? null)}
          </p>
        </div>
      </div>

      <div className="border-t border-line px-5 py-5 sm:px-7">
        <div className="flex gap-3 rounded-2xl bg-brand-light/55 p-4 text-sm leading-6 text-brand-dark">
          <Icon name="shield" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">{PRESENCE_LOCATION_DISCLOSURE}</p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              {MOTOBOY_AUTONOMY_NOTICE}
            </p>
          </div>
        </div>
        {feedback && (
          <div
            className={
              feedback.kind === "success"
                ? "mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
                : feedback.kind === "warning"
                  ? "mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800"
                  : "mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
            }
            role="status"
            aria-live="polite"
          >
            {feedback.text}
            {feedback.code === "session" && (
              <Link href="/entrar" className="ml-2 underline">
                Entrar novamente
              </Link>
            )}
          </div>
        )}
        {online &&
          !tracking &&
          operation === "idle" &&
          feedback?.code !== "session" && (
            <Button
              className="mt-4 w-full sm:w-auto"
              variant="outline"
              onClick={goOnline}
            >
              Reativar localização neste dispositivo
            </Button>
          )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="info">Sem escala</Badge>
          <Badge variant="info">Sem jornada mínima</Badge>
          <Badge variant="info">Sem metas de disponibilidade</Badge>
        </div>
      </div>
    </Card>
  );
}
