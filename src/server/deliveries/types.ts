import type { Role } from "@/server/auth/types";
import type { DistanceMethod } from "@/server/routing/types";

export const DELIVERY_STATUSES = [
  "SEARCHING_MOTOBOY",
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
  "COMPLETED",
  "CANCELLED_BY_COMPANY",
  "CANCELLED_BY_MOTOBOY",
  "EXPIRED",
  "DISPUTED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryStatusHistoryView {
  id: string;
  previousStatus: DeliveryStatus | null;
  newStatus: DeliveryStatus;
  actorRole: Role | null;
  note: string | null;
  createdAt: string;
}

export const DELIVERY_EXTRA_TYPES = [
  "WAITING",
  "RETURN",
  "PURCHASE",
  "SPECIAL_WEIGHT_VOLUME",
  "CANCELLATION_AFTER_DEPARTURE",
  "OTHER",
] as const;
export type DeliveryExtraType = (typeof DELIVERY_EXTRA_TYPES)[number];
export type DeliveryExtraStatus =
  "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";

export interface DeliveryExtraHistoryView {
  id: string;
  previousStatus: DeliveryExtraStatus | null;
  newStatus: DeliveryExtraStatus;
  action: "CREATED" | "ACKNOWLEDGED" | "REJECTED" | "CANCELLED";
  actorRole: Role;
  note: string | null;
  createdAt: string;
}

export interface DeliveryExtraView {
  id: string;
  type: DeliveryExtraType;
  description: string;
  amount: number | null;
  informedByRole: Role;
  status: DeliveryExtraStatus;
  note: string | null;
  createdAt: string;
  history: DeliveryExtraHistoryView[];
}

export interface NavigationLinks {
  googleMaps: string;
  waze: string;
}

export interface DeliveryActor {
  userId: string;
  role: Role;
}

export interface DeliveryView {
  id: string;
  companyId: string;
  motoboyId: string | null;
  motoboyName: string | null;
  companyName: string;
  pickupLabel: string;
  pickupAddress: string;
  pickupNumber: string;
  pickupNeighborhood: string;
  pickupCity: "PETROLINA_PE" | "JUAZEIRO_BA";
  pickupState: string;
  destinationAddress: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationComplement: string | null;
  destinationReference: string | null;
  destinationCity: "PETROLINA_PE" | "JUAZEIRO_BA";
  destinationState: string;
  distanceEstimateKm: number;
  distanceMethod: DistanceMethod;
  routeDurationSeconds: number | null;
  routeCalculatedAt: string | null;
  suggestedPrice: number | null;
  companyRatingAverage?: number | null;
  companyRatingCount?: number;
  distanceToPickupKm?: number;
  offeredPrice: number;
  paymentMethod: "PIX" | "CASH" | "COMPANY_SETTLEMENT" | "OTHER";
  notes: string | null;
  status: DeliveryStatus;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
  createdAt: string;
  pickupNavigation?: NavigationLinks;
  destinationNavigation?: NavigationLinks;
  history?: DeliveryStatusHistoryView[];
  extras?: DeliveryExtraView[];
}

export interface DeliveryRecord extends DeliveryView {
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

export interface MotoboyDeliveryContext {
  id: string;
  city: "PETROLINA_PE" | "JUAZEIRO_BA";
  isOnline: boolean;
  lastLocationAt: Date | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
}

export interface CompanyPickupContext {
  companyId: string;
  companyName: string;
  locationId: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  city: "PETROLINA_PE" | "JUAZEIRO_BA";
  state: string;
  latitude: number;
  longitude: number;
}
