import type {
  BillableRole,
  SubscriptionRecord,
} from "@/server/subscriptions/types";
import type { UserStatus } from "@/server/auth/types";

export type PaymentAttemptStatus =
  | "CREATED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED"
  | "ERROR";

export type PaymentMethodKind = "pix" | "credit_card";

export interface PaymentActor {
  userId: string;
  role: "MOTOBOY" | "COMPANY" | "ADMIN";
  status: UserStatus;
}

export interface PaymentAttemptRecord {
  id: string;
  subscriptionId: string;
  userId: string | null;
  planId: string | null;
  providerPaymentId: string | null;
  externalReference: string | null;
  idempotencyKey: string | null;
  amount: number;
  currency: string;
  status: PaymentAttemptStatus;
  providerStatusDetail: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  accessGrantedAt: Date | null;
  providerCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderOneOffPayment {
  id: string;
  status: string;
  statusDetail: string | null;
  paymentMethod: string | null;
  amount: number;
  currency: string;
  externalReference: string | null;
  internalPaymentId: string | null;
  userId: string | null;
  planId: string | null;
  role: BillableRole | null;
  paidAt: Date | null;
  createdAt: Date | null;
  expiresAt: Date | null;
  pix: {
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
  } | null;
}

export interface PaymentProviderClient {
  createPayment(input: {
    idempotencyKey: string;
    internalPaymentId: string;
    userId: string;
    planId: string;
    role: BillableRole;
    amount: number;
    description: string;
    externalReference: string;
    payerEmail: string;
    paymentMethodId: string;
    token: string | null;
    issuerId: string | null;
    installments: number | null;
    identification: { type: "CPF" | "CNPJ"; number: string } | null;
    notificationUrl: string;
  }): Promise<ProviderOneOffPayment>;
  getPayment(id: string): Promise<ProviderOneOffPayment>;
}

export interface PaymentRepository {
  createAttempt(input: {
    id: string;
    subscription: SubscriptionRecord;
    userId: string;
    planId: string;
    idempotencyKey: string;
    externalReference: string;
    amount: number;
    now: Date;
  }): Promise<{ attempt: PaymentAttemptRecord; reused: boolean }>;
  findAttemptByProviderId(id: string): Promise<PaymentAttemptRecord | null>;
  findAttemptById(id: string): Promise<PaymentAttemptRecord | null>;
  findAttemptByExternalReference(
    externalReference: string,
  ): Promise<PaymentAttemptRecord | null>;
  attachProviderPayment(
    attemptId: string,
    payment: ProviderOneOffPayment,
    status: PaymentAttemptStatus,
  ): Promise<PaymentAttemptRecord>;
  markAttemptError(attemptId: string): Promise<void>;
  applyConfirmedPayment(input: {
    eventId: string;
    eventType: string;
    attemptId: string;
    payment: ProviderOneOffPayment;
    status: PaymentAttemptStatus;
    processedAt: Date;
  }): Promise<"processed" | "duplicate" | "access_granted">;
}
