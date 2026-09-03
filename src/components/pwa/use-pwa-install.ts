"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getAppInstalled,
  getInstallPrompt,
  setAppInstalled,
  setInstallPrompt,
  subscribeToInstallPrompt,
  type InstallPromptEvent,
} from "./pwa-install-store";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function isIosDevice(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
) {
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      setPrompt(getInstallPrompt());
      setInstalled(isStandalone() || getAppInstalled());
      setIos(
        isIosDevice(
          navigator.userAgent,
          navigator.platform,
          navigator.maxTouchPoints,
        ),
      );
      setReady(true);
    };
    sync();
    const unsubscribe = subscribeToInstallPrompt(sync);
    media.addEventListener?.("change", sync);
    return () => {
      unsubscribe();
      media.removeEventListener?.("change", sync);
    };
  }, []);

  const install = useCallback(async () => {
    const current = getInstallPrompt();
    if (!current) return "unavailable" as const;
    try {
      await current.prompt();
      const choice = await current.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") setAppInstalled(true);
      return choice.outcome;
    } catch {
      setInstallPrompt(null);
      return "unavailable" as const;
    }
  }, []);

  return {
    ready,
    installed,
    isIos: ios,
    canPrompt: Boolean(prompt),
    install,
  };
}
