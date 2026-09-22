"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  initMetaPixel,
  isMetaPixelEnabled,
  trackPageView,
} from "@/lib/analytics/meta-pixel";

export function MetaPixel() {
  const pathname = usePathname();
  const sensitiveRoute = pathname === "/r" || pathname.startsWith("/r/");
  const enabled = isMetaPixelEnabled() && !sensitiveRoute;

  useEffect(() => {
    if (!enabled) return;
    initMetaPixel();
    trackPageView(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Script
      id="meta-pixel"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
      onReady={() => {
        initMetaPixel();
      }}
    />
  );
}
