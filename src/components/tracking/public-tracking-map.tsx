"use client";

import "leaflet/dist/leaflet.css";

import { divIcon, latLngBounds } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

const tileUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

interface Point {
  latitude: number;
  longitude: number;
}

function MapViewport({
  courier,
  destination,
}: {
  courier: Point;
  destination: Point | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!destination) {
      map.flyTo([courier.latitude, courier.longitude], 16, {
        animate: true,
        duration: 0.45,
      });
      return;
    }
    map.fitBounds(
      latLngBounds(
        [courier.latitude, courier.longitude],
        [destination.latitude, destination.longitude],
      ),
      { padding: [42, 42], maxZoom: 16, animate: true },
    );
  }, [courier.latitude, courier.longitude, destination, map]);
  return null;
}

export default function PublicTrackingMap({
  courier,
  destination,
}: {
  courier: Point;
  destination: Point | null;
}) {
  const courierIcon = useMemo(
    () =>
      divIcon({
        className: "tracking-courier-pin",
        html: "<span aria-hidden='true'>🛵</span>",
        iconAnchor: [24, 24],
        iconSize: [48, 48],
      }),
    [],
  );
  const destinationIcon = useMemo(
    () =>
      divIcon({
        className: "tracking-destination-pin",
        html: "<span class='tracking-destination-shape' aria-hidden='true'><i></i></span>",
        iconAnchor: [16, 32],
        iconSize: [32, 32],
      }),
    [],
  );

  return (
    <MapContainer
      center={[courier.latitude, courier.longitude]}
      zoom={16}
      minZoom={10}
      maxZoom={19}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker
        icon={courierIcon}
        position={[courier.latitude, courier.longitude]}
      />
      {destination && (
        <Marker
          icon={destinationIcon}
          position={[destination.latitude, destination.longitude]}
        />
      )}
      <MapViewport courier={courier} destination={destination} />
    </MapContainer>
  );
}
