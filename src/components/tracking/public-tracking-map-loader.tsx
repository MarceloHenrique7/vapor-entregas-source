"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const TrackingMap = dynamic(() => import("./public-tracking-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function PublicTrackingMapLoader(props: {
  courier: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number } | null;
}) {
  return <TrackingMap {...props} />;
}
