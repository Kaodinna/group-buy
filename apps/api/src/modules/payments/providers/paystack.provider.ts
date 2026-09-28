import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';
import type {
  InitializePaymentParams,
  InitializePaymentResult,
  PaymentProvider,
  ProviderChargeStatus,
  RefundResult,
  VerifyPaymentResult,
  WebhookEvent,
} from '../interfaces/payment-provider.interface.js';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: { authorization_url: string; access_code: string; reference: string };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    amount: number;
    currency: string;
    reference: string;
    id: number;
    paid_at: string | null;
  };
}

interface PaystackWebhookBody {
  event: string;
  data?: { reference?: string; status?: string };
}

@Injectable()
export class PaystackProvider implements PaymentProvider {
  readonly name = PaymentProviderName.PAYSTACK;

  private readonly logger = new Logger(PaystackProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async initialize(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const response = await this.request<PaystackInitializeResponse>(
      '/transaction/initialize',
      'POST',
      {
        email: params.email,
        // Paystack expects kobo (minor unit); we store/track whole Naira everywhere else (Rule 10).
        amount: params.amount * 100,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      },
    );

    if (!response.status || !response.data) {
      throw new ServiceUnavailableException(response.message || 'Failed to initialize payment');
    }

    return { authorizationUrl: response.data.authorization_url, reference: response.data.reference };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const response = await this.request<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      'GET',
    );

    if (!response.data) {
      throw new ServiceUnavailableException(response.message || 'Failed to verify payment');
    }

    return {
      reference: response.data.reference,
      status: this.mapStatus(response.data.status),
      amount: response.data.amount / 100,
      currency: response.data.currency,
      paidAt: response.data.paid_at ? new Date(response.data.paid_at) : null,
      providerTransactionId: String(response.data.id),
      raw: response.data,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    const secret = this.configService.get<string>('paystack.secretKey');
    if (!secret) return false;

    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhookEvent(body: unknown): WebhookEvent | null {
    const payload = body as PaystackWebhookBody;
    const reference = payload?.data?.reference;
    if (!reference) return null;

    if (payload.event === 'charge.success') {
      return { reference, status: 'success' };
    }
    if (payload.event === 'charge.failed') {
      return { reference, status: 'failed' };
    }
    return null;
  }

  async refund(reference: string): Promise<RefundResult> {
    const response = await this.request<{ status: boolean; message: string; data?: unknown }>(
      '/refund',
      'POST',
      { transaction: reference },
    );

    return { status: response.status ? 'success' : 'failed', raw: response };
  }

  private mapStatus(status: string): ProviderChargeStatus {
    if (status === 'success') return 'success';
    if (status === 'abandoned' || status === 'failed') return 'failed';
    return 'pending';
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const secretKey = this.configService.get<string>('paystack.secretKey');
    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Paystack is not configured - set PAYSTACK_SECRET_KEY',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      this.logger.error(`Paystack request to ${path} failed`, error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Could not reach Paystack');
    }

    const payload = (await response.json().catch(() => null)) as T | null;
    if (!payload) {
      throw new ServiceUnavailableException('Paystack returned an invalid response');
    }

    return payload;
  }
}
