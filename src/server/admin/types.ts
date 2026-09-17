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
  motoboysActivePlan: number;
  motoboysWithoutPlan: number;
  motoboysExpired: number;
  companiesFree: number;
  companiesPro: number;
  vaporPayPending: number;
  vaporPayDisputed: number;
  vaporPayPendingValue: number;
  recentRegistrations: number;
  expiringAccess: number;
  confirmedRevenue: number;
  periodLabel: string;
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
  companyProEnabled: boolean | null;
  companyProEffective: boolean | null;
  companyProEnabledAt: string | null;
  companyProExpiresAt: string | null;
  companyProAccessSource: string | null;
  motoboyPlan: {
    id: string;
    name: string;
    monthlyPrice: number;
  } | null;
  motoboyPaidAccess: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  motoboyManualAccess: {
    id: string;
    status: "ACTIVE" | "EXPIRED" | "REVOKED" | "SCHEDULED";
    reasonType: string;
    startsAt: string;
    endsAt: string;
    revokedAt: string | null;
  } | null;
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
  paymentStatus: string;
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
    | "SUBSCRIPTION_PLAN_CHANGED"
    | "COMPANY_PRO_CHANGED"
    | "MOTOBOY_PLAN_GRANTED"
    | "MOTOBOY_PLAN_EXTENDED"
    | "MOTOBOY_PLAN_REVOKED"
    | "COMPANY_PRO_ENABLED"
    | "COMPANY_PRO_EXTENDED"
    | "COMPANY_PRO_DISABLED"
    | "REVIEW_HIDDEN"
    | "REVIEW_RESTORED"
    | "REPORT_RESOLVED"
    | "SETTING_CHANGED"
    | "ADMIN_OVERRIDE";
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}
