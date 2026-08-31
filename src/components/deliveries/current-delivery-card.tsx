"use client";

import { DeliveryDetailCard } from "./delivery-detail-card";

export function CurrentDeliveryCard() {
  return (
    <DeliveryDetailCard
      endpoint="/api/deliveries/current"
      actorRole="MOTOBOY"
    />
  );
}
