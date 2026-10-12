"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCurrentPushSubscription,
  subscribeCurrentBrowser,
  unsubscribeCurrentBrowser,
} from "@/lib/push/client";

type PushState =
  "loading" | "unsupported" | "unconfigured" | "inactive" | "active" | "denied";

export function PushNotificationSettings() {
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function inspect() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setState("unsupported");
        return;
      }
      try {
        const response = await fetch("/api/notifications/push", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const config = (await response.json()) as {
          enabled: boolean;
          publicKey: string | null;
        };
        if (!config.enabled || !config.publicKey) {
          if (active) setState("unconfigured");
          return;
        }
        const subscription = await getCurrentPushSubscription();
        if (!active) return;
        setPublicKey(config.publicKey);
        setState(
          Notification.permission === "denied"
            ? "denied"
            : subscription
              ? "active"
              : "inactive",
        );
      } catch {
        if (active) {
          setState("inactive");
          setError("Não foi possível consultar as notificações agora.");
        }
      }
    }
    void inspect();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "inactive");
        return;
      }
      await subscribeCurrentBrowser(publicKey);
      setState("active");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível ativar as notificações.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      await unsubscribeCurrentBrowser();
      setState("inactive");
    } catch {
      setError("Não foi possível desativar as notificações neste dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-bold text-ink">Avisos neste dispositivo</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Receba oportunidades, mudanças de corrida e atualizações de ganhos
            mesmo com o site em segundo plano. O sistema operacional ainda pode
            limitar avisos por bateria, rede ou preferências do aparelho.
          </p>
          {state === "active" && (
            <p className="mt-2 text-sm font-bold text-emerald-700">
              Notificações ativadas neste dispositivo.
            </p>
          )}
          {state === "denied" && (
            <p className="mt-2 text-sm font-semibold text-amber-800">
              A permissão foi bloqueada. Libere notificações nas configurações
              do navegador para tentar novamente.
            </p>
          )}
          {state === "unsupported" && (
            <p className="mt-2 text-sm text-muted">
              Este navegador não oferece Web Push. A central interna continua
              funcionando normalmente.
            </p>
          )}
          {state === "unconfigured" && (
            <p className="mt-2 text-sm text-muted">
              O envio em segundo plano ainda não foi configurado no servidor. A
              central interna continua funcionando normalmente.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            No iPhone/iPad, instale a Vapor Entregas na tela inicial e use iOS
            16.4 ou mais recente.
          </p>
          {error && (
            <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
        {state === "inactive" && publicKey && (
          <Button onClick={enable} disabled={busy} className="shrink-0">
            {busy ? "Ativando..." : "Ativar notificações"}
          </Button>
        )}
        {state === "active" && (
          <Button
            variant="outline"
            onClick={disable}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? "Desativando..." : "Desativar neste aparelho"}
          </Button>
        )}
      </div>
    </Card>
  );
}
