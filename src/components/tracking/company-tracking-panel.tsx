"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TrackingLinkView } from "@/server/tracking/types";

const stateLabels = {
  NOT_CREATED: "Não ativado",
  ACTIVE: "Link ativo",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
} as const;

async function readResponse(response: Response) {
  return (await response.json()) as {
    tracking?: TrackingLinkView;
    error?: string;
  };
}

export function CompanyTrackingPanel({ deliveryId }: { deliveryId: string }) {
  const [tracking, setTracking] = useState<TrackingLinkView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const shareSupported = useSyncExternalStore(
    () => () => undefined,
    () => "share" in navigator,
    () => false,
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/tracking`, {
        cache: "no-store",
      });
      const payload = await readResponse(response);
      if (!response.ok || !payload.tracking) {
        setError(payload.error ?? "Não foi possível consultar o rastreamento.");
        return;
      }
      setTracking(payload.tracking);
      setError("");
    } catch {
      setError("Erro de rede ao consultar o rastreamento.");
    }
  }, [deliveryId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function activate() {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/tracking`, {
        method: "POST",
      });
      const payload = await readResponse(response);
      if (!response.ok || !payload.tracking) {
        setError(payload.error ?? "Não foi possível ativar o rastreamento.");
        return;
      }
      setTracking(payload.tracking);
      setFeedback("Link seguro pronto para compartilhar.");
    } catch {
      setError("Erro de rede ao ativar o rastreamento.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/tracking`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível revogar o link.");
        return;
      }
      await load();
      setFeedback("Link revogado. Ele não pode mais ser aberto.");
    } catch {
      setError("Erro de rede ao revogar o link.");
    } finally {
      setBusy(false);
    }
  }

  const shareMessage = tracking?.url
    ? `🛵 Seu pedido está a caminho!\nAcompanhe sua entrega em tempo real pela Vapor:\n${tracking.url}\nNão é necessário instalar nenhum aplicativo.`
    : "";

  async function copyLink() {
    if (!tracking?.url) return;
    try {
      await navigator.clipboard.writeText(tracking.url);
      setFeedback("Link copiado.");
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Abra o link e copie pela barra do navegador.",
      );
    }
  }

  async function shareLink() {
    if (!tracking?.url || !navigator.share) return;
    try {
      await navigator.share({
        title: "Acompanhe sua entrega",
        text: shareMessage,
      });
      setFeedback("Compartilhamento aberto.");
    } catch (shareError) {
      if ((shareError as Error).name !== "AbortError") {
        setError("Não foi possível abrir o compartilhamento do dispositivo.");
      }
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
            Tracking gratuito
          </p>
          <h3 className="mt-2 font-display text-xl font-extrabold">
            Acompanhar e compartilhar
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Gere um link sem login para o cliente. A posição aparece somente
            quando o motoboy iniciar o trajeto até o destino.
          </p>
        </div>
        {tracking && <Badge>{stateLabels[tracking.state]}</Badge>}
      </div>

      {error && (
        <p
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {feedback && (
        <p
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          role="status"
        >
          {feedback}
        </p>
      )}

      {tracking?.state === "ACTIVE" && tracking.url ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="font-bold text-ink">Status do GPS</p>
            <p className="mt-1 text-muted">
              {tracking.lastLocationAt
                ? tracking.locationStale
                  ? "Última posição desatualizada. O motoboy pode estar sem sinal ou com a Vapor fechada."
                  : "Localização recente recebida."
                : "Rastreamento aguardando localização do entregador."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={tracking.url}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({ className: "min-h-12" })}
            >
              <Icon name="map" className="size-4" /> Acompanhar entrega
            </a>
            <Button variant="outline" onClick={copyLink}>
              Copiar link
            </Button>
            {shareSupported && (
              <Button variant="outline" onClick={shareLink}>
                Compartilhar
              </Button>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({ variant: "outline" })}
            >
              Enviar no WhatsApp
            </a>
            <Button variant="ghost" disabled={busy} onClick={revoke}>
              Revogar link
            </Button>
          </div>
          <p className="text-xs text-muted">
            O link expira automaticamente e não revela telefone, e-mail,
            pagamento ou identificadores internos.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <Button
            className="min-h-12"
            disabled={busy || !tracking?.canCreate}
            onClick={activate}
          >
            <Icon name="map-pin" className="size-4" />
            {busy
              ? "Ativando..."
              : tracking?.state === "REVOKED" || tracking?.state === "EXPIRED"
                ? "Gerar novo link"
                : "Ativar acompanhamento"}
          </Button>
          {tracking && !tracking.canCreate && (
            <p className="mt-3 text-xs text-muted">
              O link fica disponível após um motoboy aceitar a entrega e antes
              do encerramento.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
