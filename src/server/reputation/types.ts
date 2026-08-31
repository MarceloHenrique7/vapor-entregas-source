import type { Role } from "@/server/auth/types";

export const REPORT_CATEGORIES = [
  "USER_NO_SHOW",
  "FRAUD_ATTEMPT",
  "INAPPROPRIATE_BEHAVIOR",
  "PAYMENT_PROBLEM",
  "THREAT",
  "ACCIDENT",
  "IRREGULAR_ORDER",
  "OTHER",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "DISMISSED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReputationActor {
  userId: string;
  role: Role;
}

export interface DeliveryParticipants {
  deliveryId: string;
  status: string;
  companyUserId: string;
  companyName: string;
  motoboyUserId: string | null;
  motoboyName: string | null;
  companyProfileId: string;
  motoboyProfileId: string | null;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface RatingView {
  id: string;
  deliveryId: string;
  score: number;
  comment: string | null;
  reviewedName: string;
  createdAt: string;
}

export interface PendingRatingView {
  deliveryId: string;
  reviewedName: string;
}

export interface RatingOverview {
  received: RatingSummary;
  given: RatingView[];
  pending: PendingRatingView[];
  counterparties: Record<string, RatingSummary & { name: string }>;
}

export interface FavoriteRecord {
  id: string;
  motoboyId: string;
  motoboyUserId: string;
  name: string;
  ratingAverage: number | null;
  ratingCount: number;
  completedDeliveries: number;
  isOnline: boolean;
  lastLocationAt: Date | null;
  createdAt: string;
}

export type FavoriteView = Omit<
  FavoriteRecord,
  "motoboyUserId" | "lastLocationAt"
>;

export interface ReportView {
  id: string;
  deliveryId: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}
