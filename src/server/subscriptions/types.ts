import type { Role, UserStatus } from "@/server/auth/types";

export type BillableRole = "MOTOBOY" | "COMPANY";
export type SubscriptionStatus =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED";
export type MercadoPagoMode = "test" | "production";
export type MercadoPagoCredentialEnvironment =
  "test" | "production" | "unknown";

export interface MercadoPagoClientDiagnostics {
  publicKeyConfigured: boolean;
  publicKeyEnvironment: MercadoPagoCredentialEnvironment;
  publicKeyHash: string | null;
}

export interface SubscriptionActor {
  userId: string;
  role: Role;
  status: UserStatus;
}

export interface SubscriptionPlanRecord {
  id: string;
  role: BillableRole;
  name: string;
  description: string;
  monthlyPrice: number;
  active: boolean;
  trialDays: number;
  externalPlanId: string | null;
  externalPlanMode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  externalReference: string | null;
  providerPlanId: string | null;
  providerSubscriptionId: string | null;
  providerStatus: string | null;
  status: SubscriptionStatus;
  monthlyPrice: number;
  checkoutUrl: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextPaymentAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: SubscriptionPlanRecord;
  events: Array<{
    id: string;
    eventType: string;
    processedAt: Date | null;
    createdAt: Date;
  }>;
  payments: SubscriptionPaymentRecord[];
}

export interface SubscriptionPaymentRecord {
  id: string;
  providerAuthorizedPaymentId: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  providerCreatedAt: Date | null;
  createdAt: Date;
}

export interface ProviderPlan {
  id: string;
  applicationId: string | null;
  collectorId: string | null;
  belongsToCurrentApplication: boolean | null;
  reason: string;
  amount: number;
  currency: string;
  frequency: number;
  frequencyType: string;
  trialDays: number;
  status: string | null;
  backUrl: string | null;
}

export interface ProviderSubscription {
  id: string;
  status: string;
  checkoutUrl: string | null;
  externalReference: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextPaymentAt: Date | null;
  planId: string | null;
}

export interface ProviderPayment {
  authorizedPaymentId: string | null;
  paymentId: string | null;
  subscriptionId: string | null;
  externalReference: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  createdAt: Date | null;
}

export interface SubscriptionProviderClient {
  createPlan(input: {
    idempotencyKey: string;
    reason: string;
    monthlyPrice: number;
    trialDays: number;
    backUrl: string;
  }): Promise<ProviderPlan>;
  getPlan(id: string): Promise<ProviderPlan>;
  updatePlan(
    id: string,
    input: {
      reason: string;
      monthlyPrice: number;
      trialDays: number;
      backUrl: string;
    },
  ): Promise<ProviderPlan>;
  createAuthorized(input: {
    providerPlanId: string;
    sellerAccountId: string | null;
    cardTokenId: string;
    clientDiagnostics?: MercadoPagoClientDiagnostics;
    externalReference: string;
    payerEmail: string;
    payerEmailMatchesLoggedUser: boolean;
    reason: string;
    backUrl: string;
    notificationUrl: string;
  }): Promise<ProviderSubscription>;
  getSubscription(id: string): Promise<ProviderSubscription>;
  cancelSubscription(id: string): Promise<ProviderSubscription>;
  reactivateSubscription(id: string): Promise<ProviderSubscription>;
  getAuthorizedPayment(id: string): Promise<ProviderPayment>;
  getPayment(id: string): Promise<ProviderPayment>;
}

export interface SubscriptionRepository {
  listPlans(): Promise<SubscriptionPlanRecord[]>;
  getPlanForRole(role: BillableRole): Promise<SubscriptionPlanRecord | null>;
  getBillingUser(userId: string): Promise<{
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
  } | null>;
  getLatest(userId: string): Promise<SubscriptionRecord | null>;
  getCurrent(userId: string): Promise<SubscriptionRecord | null>;
  hasPriorSubscription(
    userId: string,
    excludeSubscriptionId: string | null,
  ): Promise<boolean>;
  findById(id: string): Promise<SubscriptionRecord | null>;
  findByExternalReference(
    externalReference: string,
  ): Promise<SubscriptionRecord | null>;
  saveProviderPlan(
    planId: string,
    providerPlanId: string,
    mode: MercadoPagoMode,
  ): Promise<SubscriptionPlanRecord>;
  createTrial(
    userId: string,
    plan: SubscriptionPlanRecord,
    startsAt: Date,
    endsAt: Date,
  ): Promise<SubscriptionRecord>;
  createDraft(
    userId: string,
    plan: SubscriptionPlanRecord,
    now: Date,
  ): Promise<SubscriptionRecord>;
  attachProvider(
    subscriptionId: string,
    provider: ProviderSubscription,
    status: SubscriptionStatus,
  ): Promise<SubscriptionRecord>;
  expireDraft(subscriptionId: string, now: Date): Promise<void>;
  findByProviderId(providerId: string): Promise<SubscriptionRecord | null>;
  updateFromProvider(
    subscriptionId: string,
    provider: ProviderSubscription,
    status: SubscriptionStatus,
    now: Date,
  ): Promise<SubscriptionRecord>;
  cancelLocal(subscriptionId: string, now: Date): Promise<SubscriptionRecord>;
  applyProviderEvent(input: {
    providerEventId: string;
    eventType: string;
    subscriptionId: string | null;
    providerResourceId: string;
    providerStatus: string | null;
    providerSubscription: ProviderSubscription | null;
    subscriptionStatus: SubscriptionStatus | null;
    payment: ProviderPayment | null;
    processedAt: Date;
  }): Promise<"processed" | "duplicate">;
  recordLocalEvent(input: {
    providerEventId: string;
    eventType: string;
    subscriptionId: string;
    metadata?: Record<string, string | number | boolean | null>;
    processedAt: Date;
  }): Promise<void>;
  hasOperationalSubscription(userId: string, now: Date): Promise<boolean>;
  updatePlan(
    adminUserId: string,
    planId: string,
    input: { monthlyPrice: number; active: boolean; trialDays: number },
    now: Date,
  ): Promise<SubscriptionPlanRecord | null>;
}
