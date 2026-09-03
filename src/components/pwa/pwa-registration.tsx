"use client";

import { useEffect } from "react";

import {
  setAppInstalled,
  setInstallPrompt,
  type InstallPromptEvent,
} from "./pwa-install-store";

export function PwaRegistration() {
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const complete = () => {
      setInstallPrompt(null);
      setAppInstalled(true);
    };
    const register = () => {
      if (!("serviceWorker" in navigator)) return;
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return null;
}
