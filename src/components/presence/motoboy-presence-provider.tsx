"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  LOCATION_BROWSER_MAX_AGE_MS,
  LOCATION_BROWSER_TIMEOUT_MS,
  LOCATION_DISTANCE_THRESHOLD_METERS,
  LOCATION_MAX_UPDATE_INTERVAL_MS,
} from "@/config/presence";
import {
  calculateStraightLineDistance,
  type Coordinates,
} from "@/lib/maps/geo";

type PermissionState =
  "unknown" | "prompt" | "granted" | "denied" | "unsupported";
type Operation = "loading" | "idle" | "activating" | "deactivating";

export interface PresenceStatus {
  isOnline: boolean;
  onlineSince: string | null;
  lastLocationAt: string | null;
  expiresAt: string | null;
}

interface Feedback {
  kind: "error" | "warning" | "success";
  text: string;
  code?: "session" | "blocked" | "permission" | "unsupported";
}

interface PresenceContextValue {
  presence: PresenceStatus | null;
  permission: PermissionState;
  operation: Operation;
  tracking: boolean;
  feedback: Feedback | null;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);
const TRACKING_SESSION_KEY = "vapor-entregas:motoboy-location-authorized";
const LEGACY_TRACKING_SESSION_KEY = "entregavale:motoboy-location-authorized";
const LOGOUT_EVENT = "vapor-entregas:logout";
const LEGACY_LOGOUT_EVENT = "entregavale:logout";
const CLIENT_ATTEMPT_COOLDOWN_MS = 30_000;

function clearTrackingAuthorization() {
  sessionStorage.removeItem(TRACKING_SESSION_KEY);
  sessionStorage.removeItem(LEGACY_TRACKING_SESSION_KEY);
}

function hasTrackingAuthorization() {
  if (sessionStorage.getItem(TRACKING_SESSION_KEY) === "true") return true;
  if (sessionStorage.getItem(LEGACY_TRACKING_SESSION_KEY) !== "true")
    return false;

  sessionStorage.setItem(TRACKING_SESSION_KEY, "true");
  sessionStorage.removeItem(LEGACY_TRACKING_SESSION_KEY);
  return true;
}

const geolocationOptions: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: LOCATION_BROWSER_MAX_AGE_MS,
  timeout: LOCATION_BROWSER_TIMEOUT_MS,
};

function locationErrorFeedback(error: GeolocationPositionError): Feedback {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      kind: "error",
      code: "permission",
      text: "Para ficar online e receber oportunidades próximas, permita o acesso à localização.",
    };
  }
  if (error.code === error.TIMEOUT) {
    return {
      kind: "error",
      text: "A localização demorou mais que o esperado. Verifique o GPS e tente novamente.",
    };
  }
  return {
    kind: "error",
    text: "Sua localização está indisponível. Verifique o GPS e tente novamente.",
  };
}

function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      reject,
      geolocationOptions,
    );
  });
}

async function readPayload(response: Response) {
  return (await response.json()) as {
    presence?: PresenceStatus;
    error?: string;
    code?: string;
  };
}

export function MotoboyPresenceProvider({ children }: { children: ReactNode }) {
  const [presence, setPresence] = useState<PresenceStatus | null>(null);
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [operation, setOperation] = useState<Operation>("loading");
  const [tracking, setTracking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const watchId = useRef<number | null>(null);
  const heartbeatId = useRef<number | null>(null);
  const lastSent = useRef<{ coordinates: Coordinates; sentAt: number } | null>(
    null,
  );
  const lastAttemptAt = useRef(0);
  const updateInFlight = useRef(false);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (heartbeatId.current !== null) {
      window.clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }
    setTracking(false);
  }, []);

  const handleApiFailure = useCallback(
    (response: Response, payload: { error?: string; code?: string }) => {
      if (response.status === 401) {
        stopWatching();
        setFeedback({
          kind: "error",
          code: "session",
          text: payload.error ?? "Sua sessão expirou. Entre novamente.",
        });
        return;
      }
      if (response.status === 403) {
        stopWatching();
        setFeedback({
          kind: "error",
          code: "blocked",
          text: "Esta conta não pode alterar a disponibilidade. Verifique o acesso da conta.",
        });
        return;
      }
      setFeedback({
        kind: "error",
        text: payload.error ?? "Erro de rede. Tente novamente.",
      });
    },
    [stopWatching],
  );

  const sendLocation = useCallback(
    async (coordinates: Coordinates) => {
      const now = Date.now();
      if (
        updateInFlight.current ||
        now - lastAttemptAt.current < CLIENT_ATTEMPT_COOLDOWN_MS
      )
        return;
      const previous = lastSent.current;
      const distanceMeters = previous
        ? calculateStraightLineDistance(previous.coordinates, coordinates) *
          1_000
        : Number.POSITIVE_INFINITY;
      const intervalExpired =
        !previous || now - previous.sentAt >= LOCATION_MAX_UPDATE_INTERVAL_MS;
      if (
        distanceMeters < LOCATION_DISTANCE_THRESHOLD_METERS &&
        !intervalExpired
      )
        return;

      updateInFlight.current = true;
      lastAttemptAt.current = now;
      try {
        const response = await fetch("/api/motoboy/presence/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(coordinates),
        });
        const payload = await readPayload(response);
        if (response.status === 429) return;
        if (!response.ok || !payload.presence) {
          handleApiFailure(response, payload);
          if (response.status === 409) {
            stopWatching();
            clearTrackingAuthorization();
            setPresence((current) =>
              current
                ? {
                    ...current,
                    isOnline: false,
                    onlineSince: null,
                    expiresAt: null,
                  }
                : current,
            );
          }
          return;
        }
        lastSent.current = { coordinates, sentAt: now };
        setPresence(payload.presence);
        setFeedback(null);
      } catch {
        setFeedback({
          kind: "warning",
          text: "Sem conexão para atualizar agora. Tentaremos novamente de forma moderada.",
        });
      } finally {
        updateInFlight.current = false;
      }
    },
    [handleApiFailure, stopWatching],
  );

  const startWatching = useCallback(
    (initial?: Coordinates) => {
      if (!("geolocation" in navigator)) return;
      stopWatching();
      if (initial)
        lastSent.current = { coordinates: initial, sentAt: Date.now() };
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          setPermission("granted");
          void sendLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          stopWatching();
          clearTrackingAuthorization();
          if (error.code === error.PERMISSION_DENIED) setPermission("denied");
          setFeedback(locationErrorFeedback(error));
          setPresence((current) =>
            current
              ? {
                  ...current,
                  isOnline: false,
                  onlineSince: null,
                  expiresAt: null,
                }
              : current,
          );
          void fetch("/api/motoboy/presence/offline", { method: "POST" }).catch(
            () => undefined,
          );
        },
        geolocationOptions,
      );
      heartbeatId.current = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            void sendLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () => undefined,
          geolocationOptions,
        );
      }, LOCATION_MAX_UPDATE_INTERVAL_MS);
      setTracking(true);
    },
    [sendLocation, stopWatching],
  );

  const goOnline = useCallback(async () => {
    setFeedback(null);
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      setFeedback({
        kind: "error",
        code: "unsupported",
        text: "Este navegador não oferece suporte à geolocalização.",
      });
      return;
    }
    setOperation("activating");
    try {
      const coordinates = await getCurrentCoordinates();
      setPermission("granted");
      const response = await fetch("/api/motoboy/presence/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coordinates),
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.presence) {
        handleApiFailure(response, payload);
        return;
      }
      setPresence(payload.presence);
      setFeedback({ kind: "success", text: "Você está online." });
      sessionStorage.setItem(TRACKING_SESSION_KEY, "true");
      startWatching(coordinates);
    } catch (error) {
      const geolocationError = error as GeolocationPositionError;
      if (typeof geolocationError?.code === "number") {
        if (geolocationError.code === geolocationError.PERMISSION_DENIED)
          setPermission("denied");
        setFeedback(locationErrorFeedback(geolocationError));
      } else {
        setFeedback({
          kind: "error",
          text: "Não foi possível ficar online. Verifique sua conexão.",
        });
      }
    } finally {
      setOperation("idle");
    }
  }, [handleApiFailure, startWatching]);

  const goOffline = useCallback(async () => {
    stopWatching();
    clearTrackingAuthorization();
    lastSent.current = null;
    setOperation("deactivating");
    setFeedback(null);
    try {
      const response = await fetch("/api/motoboy/presence/offline", {
        method: "POST",
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.presence) {
        handleApiFailure(response, payload);
        if (response.status === 401 || response.status === 403) return;
        setFeedback((current) => ({
          kind: "warning",
          code: current?.code,
          text: "A coleta foi interrompida neste dispositivo, mas não foi possível confirmar o status no servidor. A presença expirará automaticamente.",
        }));
        return;
      }
      setPresence(payload.presence);
      setFeedback({
        kind: "success",
        text: "Você está offline. Nenhuma nova localização será coletada.",
      });
    } catch {
      setFeedback({
        kind: "warning",
        text: "A coleta foi interrompida neste dispositivo. Sem conexão, a presença no servidor expirará automaticamente.",
      });
    } finally {
      setOperation("idle");
    }
  }, [handleApiFailure, stopWatching]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!("geolocation" in navigator)) setPermission("unsupported");
      else if ("permissions" in navigator) {
        try {
          const result = await navigator.permissions.query({
            name: "geolocation",
          });
          if (!cancelled) setPermission(result.state);
        } catch {
          if (!cancelled) setPermission("unknown");
        }
      }
      try {
        const response = await fetch("/api/motoboy/presence", {
          cache: "no-store",
        });
        const payload = await readPayload(response);
        if (!response.ok || !payload.presence) {
          handleApiFailure(response, payload);
          return;
        }
        if (cancelled) return;
        setPresence(payload.presence);
        if (payload.presence.isOnline && hasTrackingAuthorization()) {
          startWatching();
        }
      } catch {
        if (!cancelled) {
          setFeedback({
            kind: "error",
            text: "Erro de rede ao consultar sua disponibilidade.",
          });
        }
      } finally {
        if (!cancelled) setOperation("idle");
      }
    }
    void load();
    const handleLogout = () => {
      stopWatching();
      clearTrackingAuthorization();
    };
    window.addEventListener(LOGOUT_EVENT, handleLogout);
    window.addEventListener(LEGACY_LOGOUT_EVENT, handleLogout);
    return () => {
      cancelled = true;
      window.removeEventListener(LOGOUT_EVENT, handleLogout);
      window.removeEventListener(LEGACY_LOGOUT_EVENT, handleLogout);
      stopWatching();
    };
  }, [handleApiFailure, startWatching, stopWatching]);

  return (
    <PresenceContext.Provider
      value={{
        presence,
        permission,
        operation,
        tracking,
        feedback,
        goOnline,
        goOffline,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function useMotoboyPresence() {
  const value = useContext(PresenceContext);
  if (!value)
    throw new Error("useMotoboyPresence deve ser usado dentro do provider.");
  return value;
}
