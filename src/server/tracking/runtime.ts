import { getSensitiveDataEnv, getTrackingEnv } from "@/server/config/env";

import type { TrackingRuntimeConfig } from "./tracking-service";

export function getTrackingRuntimeConfig(): TrackingRuntimeConfig {
  const tracking = getTrackingEnv();
  return {
    appUrl: tracking.NEXT_PUBLIC_APP_URL,
    encryptionKey: getSensitiveDataEnv().FIELD_ENCRYPTION_KEY,
    linkTtlHours: tracking.TRACKING_LINK_TTL_HOURS,
    terminalTtlHours: tracking.TRACKING_TERMINAL_TTL_HOURS,
    locationMinIntervalSeconds: tracking.TRACKING_LOCATION_MIN_INTERVAL_SECONDS,
    locationStaleSeconds: tracking.TRACKING_LOCATION_STALE_SECONDS,
  };
}
