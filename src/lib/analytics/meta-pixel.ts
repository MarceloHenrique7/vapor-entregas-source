export type MetaEventParameters = Record<
  string,
  string | number | boolean | null | undefined
>;

export type MetaEventOptions = {
  eventId?: string;
};

type MetaPixelArguments =
  | ["init", string]
  | ["track", string, MetaEventParameters?]
  | ["track", string, MetaEventParameters, { eventID: string }]
  | ["trackCustom", string, MetaEventParameters?]
  | ["trackCustom", string, MetaEventParameters, { eventID: string }];

type MetaPixelFunction = {
  (...args: MetaPixelArguments): void;
  callMethod?: (...args: MetaPixelArguments) => void;
  queue: MetaPixelArguments[];
  loaded: boolean;
  version: string;
  push: MetaPixelFunction;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const pixelEnabled = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "true";
let initialized = false;
let lastPageViewPath: string | null = null;

export function isMetaPixelEnabled() {
  return pixelEnabled && Boolean(pixelId);
}

function installQueue() {
  if (window.fbq) return window.fbq;

  const fbq = ((...args: MetaPixelArguments) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as MetaPixelFunction;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

export function initMetaPixel() {
  if (typeof window === "undefined" || !isMetaPixelEnabled() || !pixelId) {
    return false;
  }
  const fbq = installQueue();
  if (!initialized) {
    fbq("init", pixelId);
    initialized = true;
  }
  return true;
}

function sendEvent(
  command: "track" | "trackCustom",
  eventName: string,
  parameters: MetaEventParameters = {},
  options: MetaEventOptions = {},
) {
  if (!initMetaPixel() || !window.fbq) return false;
  if (options.eventId) {
    window.fbq(command, eventName, parameters, { eventID: options.eventId });
  } else {
    window.fbq(command, eventName, parameters);
  }
  return true;
}

export function trackPageView(pathname: string) {
  if (lastPageViewPath === pathname) return false;
  const tracked = sendEvent("track", "PageView");
  if (tracked) lastPageViewPath = pathname;
  return tracked;
}

export function trackMetaEvent(
  eventName: string,
  parameters?: MetaEventParameters,
  options?: MetaEventOptions,
) {
  return sendEvent("track", eventName, parameters, options);
}

export function trackMetaCustomEvent(
  eventName: string,
  parameters?: MetaEventParameters,
  options?: MetaEventOptions,
) {
  return sendEvent("trackCustom", eventName, parameters, options);
}

function trackOnce(deduplicationKey: string, track: () => boolean): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = `vapor:meta:${deduplicationKey}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return false;
    const tracked = track();
    if (tracked) window.sessionStorage.setItem(storageKey, "1");
    return tracked;
  } catch {
    return track();
  }
}

export function trackMetaEventOnce(
  deduplicationKey: string,
  eventName: string,
  parameters?: MetaEventParameters,
) {
  return trackOnce(deduplicationKey, () =>
    trackMetaEvent(eventName, parameters),
  );
}

export function trackMetaCustomEventOnce(
  deduplicationKey: string,
  eventName: string,
  parameters?: MetaEventParameters,
) {
  return trackOnce(deduplicationKey, () =>
    trackMetaCustomEvent(eventName, parameters),
  );
}
