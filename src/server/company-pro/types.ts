export interface CompanyProOverview {
  proEnabled: true;
  period: { key: string; from: string; to: string; label: string };
  metrics: {
    totalDeliveries: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    activeDeliveries: number;
    totalRecordedSpend: number;
    averageCost: number;
    totalDistanceKm: number;
    averageCostPerKm: number | null;
    completionRate: number;
    motoboysUsed: number;
    pendingPayments: number;
    confirmedPayments: number;
    pendingValue: number;
  };
  daily: Array<{ day: string; deliveries: number; spend: number }>;
  hours: Array<{ hour: number; deliveries: number }>;
  statuses: Array<{ status: string; count: number }>;
  topMotoboys: Array<{ name: string; deliveries: number; spend: number }>;
  comparison: {
    previousDeliveries: number;
    previousSpend: number;
    deliveryChangePercent: number | null;
    spendChangePercent: number | null;
  };
}
