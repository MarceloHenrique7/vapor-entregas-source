import type {
  DeliveryPaymentStatus,
  DeliveryView,
} from "@/server/deliveries/types";

export const EARNINGS_PERIODS = ["7", "30", "90", "all"] as const;
export type EarningsPeriod = (typeof EARNINGS_PERIODS)[number];

export interface EarningsDeliveryView {
  id: string;
  companyName: string;
  offeredPrice: number;
  paymentMethod: DeliveryView["paymentMethod"];
  paymentStatus: DeliveryPaymentStatus;
  completedAt: string;
}

export interface EarningsGroup {
  paymentStatus: DeliveryPaymentStatus;
  amount: number;
  count: number;
}

export interface MotoboyEarningsView {
  period: EarningsPeriod;
  totals: {
    gross: number;
    confirmed: number;
    awaitingConfirmation: number;
    disputed: number;
    deliveries: number;
  };
  deliveries: EarningsDeliveryView[];
}
