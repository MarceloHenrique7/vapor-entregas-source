"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TRACKING_BACKGROUND_LIMITATION,
  TRACKING_BROWSER_HEARTBEAT_MS,
  TRACKING_BROWSER_MAX_AGE_MS,
  TRACKING_BROWSER_MIN_INTERVAL_MS,
  TRACKING_BROWSER_TIMEOUT_MS,
  TRACKING_DISCLOSURE,
  TRACKING_DISTANCE_THRESHOLD_METERS,
  TRACKING_MAX_ACCEPTABLE_ACCURACY_METERS,
} from "@/config/tracking";
import { calculateStraightLineDistance } from "@/lib/maps/geo";
import type { DeliveryStatus } from "@/server/deliveries/types";
import type { TrackingLinkView } from "@/server/tracking/types";

type TrackingUiState =
  "disabled" | "waiting" | "active" | "no-signal" | "denied" | "unsupported";

const labels: Record<TrackingUiState, string> = {
  disabled: "Desativado",
  waiting: "Aguardando permissão",
  active: "Rastreamento ativo",
  "no-signal": "Sem sinal",
  denied: "Permissão negada",
  unsupported: "GPS indisponível",
};

export function MotoboyDeliveryTracker({
  deliveryId,
  status,
}: {
  deliveryId: string;
  status: DeliveryStatus;
}) {
  const [link, setLink] = useState<TrackingLinkView | null>(null);
  const [uiState, setUiState] = useState<TrackingUiState>("disabled");
  const [message, setMessage] = useState("");
  const watchId = useRef<number | null>(null);
  const heartbeatId = useRef<number | null>(null);
  const lastSent = useRef<{
    latitude: number;
    longitude: number;
    at: number;
  } | null>(null);
  const sending = useRef(false);

  const stop = useCallback(() => {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (heartbeatId.current !== null) {
      window.clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }
  }, []);

  const loadLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/tracking`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        tracking?: TrackingLinkView;
      };
      if (response.ok && payload.tracking) setLink(payload.tracking);
    } catch {
      setUiState("no-signal");
      setMessage("Não foi possível confirmar o tracking com o servidor.");
    }
  }, [deliveryId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadLink(), 0);
    const interval = window.setInterval(loadLink, 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadLink]);

  const sendPosition = useCallback(
    async (position: GeolocationPosition, force = false) => {
      if (position.coords.accuracy > TRACKING_MAX_ACCEPTABLE_ACCURACY_METERS) {
        setUiState("no-signal");
        setMessage(
          "O sinal do GPS está impreciso. Vá para uma área aberta e tente novamente.",
        );
        return;
      }
      const now = Date.now();
      const previous = lastSent.current;
      const elapsed = previous ? now - previous.at : Number.POSITIVE_INFINITY;
      const distance = previous
        ? calculateStraightLineDistance(
            { latitude: previous.latitude, longitude: previous.longitude },
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          ) * 1_000
        : Number.POSITIVE_INFINITY;
      if (
        sending.current ||
        (!force &&
          (elapsed < TRACKING_BROWSER_MIN_INTERVAL_MS ||
            (distance < TRACKING_DISTANCE_THRESHOLD_METERS &&
              elapsed < TRACKING_BROWSER_HEARTBEAT_MS)))
      ) {
        return;
      }
      sending.current = true;
      try {
        const response = await fetch(
          `/api/deliveries/${deliveryId}/tracking/location`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              capturedAt: new Date(position.timestamp).toISOString(),
            }),
          },
        );
        if (response.status === 429) return;
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setUiState(response.status === 409 ? "disabled" : "no-signal");
          setMessage(payload.error ?? "Não foi possível atualizar a posição.");
          if (response.status === 409 || response.status === 403) stop();
          return;
        }
        lastSent.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          at: now,
        };
        setUiState("active");
        setMessage("Localização enviada com segurança.");
      } catch {
        setUiState("no-signal");
        setMessage("Sem conexão. Tentaremos novamente quando houver sinal.");
      } finally {
        sending.current = false;
      }
    },
    [deliveryId, stop],
  );

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setUiState("unsupported");
      setMessage("Este navegador não oferece geolocalização.");
      return;
    }
    stop();
    setUiState("waiting");
    setMessage("Autorize a localização para iniciar o acompanhamento.");
    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: TRACKING_BROWSER_MAX_AGE_MS,
      timeout: TRACKING_BROWSER_TIMEOUT_MS,
    };
    watchId.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(position),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setUiState("denied");
          setMessage(
            "Permita a localização nas configurações do navegador e tente novamente.",
          );
          stop();
        } else {
          setUiState("no-signal");
          setMessage(
            "GPS sem sinal confiável. Verifique o aparelho e tente novamente.",
          );
        }
      },
      options,
    );
    heartbeatId.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => void sendPosition(position, true),
        () => setUiState("no-signal"),
        options,
      );
    }, TRACKING_BROWSER_HEARTBEAT_MS);
  }, [sendPosition, stop]);

  const eligible = status === "IN_DELIVERY" && link?.state === "ACTIVE";
  useEffect(() => {
    const synchronizeTracking = window.setTimeout(() => {
      if (eligible) start();
      else {
        stop();
        setUiState("disabled");
        setMessage(
          status === "IN_DELIVERY"
            ? "Aguardando a empresa ativar o link de acompanhamento."
            : "O GPS público começa somente após iniciar a entrega ao cliente.",
        );
      }
    }, 0);
    return () => {
      window.clearTimeout(synchronizeTracking);
      stop();
    };
  }, [eligible, start, status, stop]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
            Localização da corrida
          </p>
          <h3 className="mt-2 font-display text-xl font-extrabold">
            Rastreamento da entrega
          </h3>
        </div>
        <Badge variant={uiState === "active" ? "success" : "neutral"}>
          {labels[uiState]}
        </Badge>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">
        {uiState === "active" ? TRACKING_DISCLOSURE : message}
      </p>
      <p className="mt-3 text-xs leading-5 text-muted">
        {TRACKING_BACKGROUND_LIMITATION}
      </p>
      {(uiState === "denied" || uiState === "no-signal") && eligible && (
        <Button className="mt-4" variant="outline" onClick={start}>
          Solicitar localização novamente
        </Button>
      )}
    </Card>
  );
}
