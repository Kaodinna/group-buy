export type PaymentProviderName = "PAYSTACK" | "FLUTTERWAVE";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Payment {
  _id: string;
  userId: string;
  campaignId: string;
  orderId: string | null;
  provider: PaymentProviderName;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitializePaymentResult {
  reference: string;
  authorizationUrl: string;
}
