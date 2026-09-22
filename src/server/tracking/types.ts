import type { Role } from "@/server/auth/types";
import type { DeliveryStatus } from "@/server/deliveries/types";

export interface TrackingActor {
  userId: string;
  role: Role;
}

export interface TrackingRecord {
  id: string;
  deliveryId: string;
  tokenHash: string;
  tokenEncrypted: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAccuracyMeters: number | null;
  lastLocationAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingDeliveryRecord {
  id: string;
  status: DeliveryStatus;
  companyName: string;
  companyUserId: string;
  motoboyUserId: string | null;
  destinationNeighborhood: string;
  destinationCity: "PETROLINA_PE" | "JUAZEIRO_BA";
  destinationState: string;
  destinationLatitude: number;
  destinationLongitude: number;
  completedAt: Date | null;
  cancelledAt: Date | null;
  tracking: TrackingRecord | null;
}

export type TrackingLinkState =
  "NOT_CREATED" | "ACTIVE" | "EXPIRED" | "REVOKED";

export interface TrackingLinkView {
  state: TrackingLinkState;
  canCreate: boolean;
  url: string | null;
  expiresAt: string | null;
  lastLocationAt: string | null;
  locationStale: boolean;
  deliveryStatus: DeliveryStatus;
}

export interface PublicTrackingView {
  state: "WAITING" | "LIVE" | "STALE" | "COMPLETED" | "CANCELLED";
  deliveryStatus: DeliveryStatus;
  companyName: string;
  destination: {
    neighborhood: string;
    city: "PETROLINA_PE" | "JUAZEIRO_BA";
    state: string;
    latitude: number;
    longitude: number;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    updatedAt: string;
  } | null;
  expiresAt: string;
}
