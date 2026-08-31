"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import type { Coordinates } from "@/lib/maps/geo";

import { Icon } from "../icons/icon";
import { Skeleton } from "../ui/skeleton";

const DynamicMap = dynamic(() => import("./company-location-map"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full flex-col justify-center gap-4 p-6"
      aria-label="Carregando mapa"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-52 w-full" />
    </div>
  ),
});

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    console.error("Falha ao carregar o mapa.");
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-canvas p-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
            <Icon name="map" className="size-6" />
          </span>
          <p className="font-bold text-ink">Mapa indisponível</p>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Confira sua conexão e recarregue a página para tentar novamente.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function CompanyLocationMapLoader(props: {
  coordinates: Coordinates;
  onChange: (coordinates: Coordinates) => void;
  onTileError: () => void;
}) {
  return (
    <MapErrorBoundary>
      <DynamicMap {...props} />
    </MapErrorBoundary>
  );
}
