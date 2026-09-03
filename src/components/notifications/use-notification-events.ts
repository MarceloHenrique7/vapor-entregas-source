"use client";

import { useEffect } from "react";

export function useNotificationEvents(onEvent: () => void) {
  useEffect(() => {
    const source = new EventSource("/api/notifications/events");
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
    source.addEventListener("notification", refresh);
    return () => {
      source.removeEventListener("notification", refresh);
      stopFallback();
      source.close();
    };
  }, [onEvent]);
}
