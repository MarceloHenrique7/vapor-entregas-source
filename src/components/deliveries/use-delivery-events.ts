"use client";

import { useEffect } from "react";

export function useDeliveryEvents(onEvent: () => void) {
  useEffect(() => {
    const source = new EventSource("/api/deliveries/events");
    const refresh = () => onEvent();
    let polling: number | undefined;
    const startFallback = () => {
      if (polling) return;
      refresh();
      polling = window.setInterval(refresh, 30_000);
    };
    const stopFallback = () => {
      if (!polling) return;
      window.clearInterval(polling);
      polling = undefined;
    };
    source.onopen = stopFallback;
    source.onerror = startFallback;
    source.addEventListener("nova_corrida", refresh);
    source.addEventListener("corrida_aceita", refresh);
    source.addEventListener("status_alterado", refresh);
    source.addEventListener("corrida_cancelada", refresh);
    return () => {
      source.removeEventListener("nova_corrida", refresh);
      source.removeEventListener("corrida_aceita", refresh);
      source.removeEventListener("status_alterado", refresh);
      source.removeEventListener("corrida_cancelada", refresh);
      stopFallback();
      source.close();
    };
  }, [onEvent]);
}
