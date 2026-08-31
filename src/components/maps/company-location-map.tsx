"use client";

import "leaflet/dist/leaflet.css";

import {
  divIcon,
  type LeafletMouseEvent,
  type Marker as LeafletMarker,
} from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { Coordinates } from "@/lib/maps/geo";

const tileUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function MapController({
  coordinates,
  onChange,
}: {
  coordinates: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([coordinates.latitude, coordinates.longitude], map.getZoom(), {
      animate: true,
      duration: 0.45,
    });
  }, [coordinates.latitude, coordinates.longitude, map]);
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function CompanyLocationMap({
  coordinates,
  onChange,
  onTileError,
}: {
  coordinates: Coordinates;
  onChange: (coordinates: Coordinates) => void;
  onTileError: () => void;
}) {
  const markerRef = useRef<LeafletMarker>(null);
  const icon = useMemo(
    () =>
      divIcon({
        className: "company-map-pin",
        iconAnchor: [22, 44],
        iconSize: [44, 44],
      }),
    [],
  );

  return (
    <MapContainer
      center={[coordinates.latitude, coordinates.longitude]}
      zoom={17}
      minZoom={10}
      maxZoom={19}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        eventHandlers={{ tileerror: onTileError }}
      />
      <Marker
        draggable
        icon={icon}
        position={[coordinates.latitude, coordinates.longitude]}
        ref={markerRef}
        eventHandlers={{
          dragend() {
            const position = markerRef.current?.getLatLng();
            if (position) {
              onChange({ latitude: position.lat, longitude: position.lng });
            }
          },
        }}
      />
      <MapController coordinates={coordinates} onChange={onChange} />
    </MapContainer>
  );
}
