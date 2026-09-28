import type { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';

export interface InitializePaymentParams {
  email: string;
  /** Major currency unit (whole Naira), never a client-supplied value. */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export type ProviderChargeStatus = 'success' | 'failed' | 'pending';

export interface VerifyPaymentResult {
  reference: string;
  status: ProviderChargeStatus;
  /** Major currency unit (whole Naira). */
  amount: number;
  currency: string;
  paidAt: Date | null;
  /** Provider-specific identifier, stashed for refund calls that need it. */
  providerTransactionId?: string;
  raw: unknown;
}

export interface RefundResult {
  status: 'success' | 'pending' | 'failed';
  raw: unknown;
}

export interface WebhookEvent {
  reference: string;
  status: ProviderChargeStatus;
}

/**
 * A payment gateway integration. Every provider (Paystack, Flutterwave, or
 * anything added later) implements this the same way, so PaymentsService
 * never branches on which provider is in use.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;

  initialize(params: InitializePaymentParams): Promise<InitializePaymentResult>;

  /** Authoritative status check - the only source of truth for "did this actually get paid" (Rule 5). */
  verify(reference: string): Promise<VerifyPaymentResult>;

  /** Verifies a webhook's authenticity using the raw request body bytes. */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;

  /** Extracts the event this webhook describes from the already-parsed body, or null if irrelevant. */
  parseWebhookEvent(body: unknown): WebhookEvent | null;

  refund(reference: string, providerTransactionId?: string): Promise<RefundResult>;
}
