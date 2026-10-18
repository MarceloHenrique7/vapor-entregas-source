export interface CompanyReportRow {
  id: string;
  createdAt: string;
  origin: string;
  destination: string;
  destinationNeighborhood: string;
  motoboy: string;
  distanceKm: number;
  baseValueCents: number;
  acknowledgedExtrasCents: number;
  finalRecordedValueCents: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  channel: string;
  notes: string;
}

export interface CompanyReportData {
  companyName: string;
  generatedAt: string;
  period: { from: string; to: string };
  filters: {
    status: string | null;
    motoboyId: string | null;
    channel: string | null;
  };
  summary: {
    totalDeliveries: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    totalRecordedCents: number;
    averageRecordedCents: number;
    confirmedPaymentCents: number;
    pendingOrUnconfirmedCents: number;
  };
  rows: CompanyReportRow[];
  notice: string;
}
