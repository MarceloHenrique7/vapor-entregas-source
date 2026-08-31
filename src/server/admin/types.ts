import type { Role, UserStatus } from "@/server/auth/types";
import type { ReportCategory, ReportStatus } from "@/server/reputation/types";

export interface AdminActor {
  userId: string;
  role: Role;
  status: UserStatus;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalMotoboys: number;
  totalCompanies: number;
  motoboysOnline: number;
  deliveriesCreated: number;
  deliveriesToday: number;
  deliveriesCompleted: number;
  deliveriesSearching: number;
  deliveriesCancelled: number;
  deliveriesDisputed: number;
  reportsOpen: number;
  reportsUnderReview: number;
  overallRatingAverage: number | null;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  role: Role;
  city: string | null;
  createdAt: string;
  status: UserStatus;
  relatedDeliveries: number;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  email: string;
  phone: string;
  documentMasked: string | null;
  vehiclePlate: string | null;
  fantasyName: string | null;
  location: string | null;
  isOnline: boolean | null;
  lastLocationAt: string | null;
  deliveriesAccepted: number;
  deliveriesCompleted: number;
  cancellations: number;
  reportsReceived: number;
  reportsCreated: number;
}

export interface AdminDeliveryListItem {
  id: string;
  companyName: string;
  motoboyName: string | null;
  pickupSummary: string;
  destinationSummary: string;
  city: string;
  status: string;
  offeredPrice: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminDeliveryDetail extends AdminDeliveryListItem {
  paymentMethod: string;
  notes: string | null;
  history: Array<{
    id: string;
    previousStatus: string | null;
    newStatus: string;
    actorName: string | null;
    actorRole: Role | null;
    note: string | null;
    createdAt: string;
  }>;
  ratings: Array<{
    id: string;
    reviewerName: string;
    reviewedName: string;
    score: number;
    comment: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    category: ReportCategory;
    status: ReportStatus;
    createdAt: string;
  }>;
}

export interface AdminReportListItem {
  id: string;
  reporterName: string;
  reportedName: string | null;
  deliveryId: string | null;
  category: ReportCategory;
  status: ReportStatus;
  description: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditItem {
  id: string;
  adminName: string;
  targetName: string | null;
  actionType:
    | "USER_ACTIVATED"
    | "USER_SUSPENDED"
    | "USER_BANNED"
    | "USER_REACTIVATED"
    | "REPORT_STATUS_CHANGED"
    | "PRICING_RULE_CHANGED"
    | "SUBSCRIPTION_PLAN_CHANGED";
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}
