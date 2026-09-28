import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
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

const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';

interface FlutterwaveInitializeResponse {
  status: string;
  message: string;
  data?: { link: string };
}

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    status: string;
    amount: number;
    currency: string;
    created_at: string;
  };
}

interface FlutterwaveWebhookBody {
  event?: string;
  data?: { tx_ref?: string; status?: string };
}

@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = PaymentProviderName.FLUTTERWAVE;

  private readonly logger = new Logger(FlutterwaveProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async initialize(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const response = await this.request<FlutterwaveInitializeResponse>('/payments', 'POST', {
      tx_ref: params.reference,
      amount: params.amount,
      currency: 'NGN',
      redirect_url: params.callbackUrl,
      customer: { email: params.email },
      meta: params.metadata,
    });

    if (response.status !== 'success' || !response.data) {
      throw new ServiceUnavailableException(response.message || 'Failed to initialize payment');
    }

    return { authorizationUrl: response.data.link, reference: params.reference };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const response = await this.request<FlutterwaveVerifyResponse>(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      'GET',
    );

    if (!response.data) {
      throw new ServiceUnavailableException(response.message || 'Failed to verify payment');
    }

    return {
      reference: response.data.tx_ref,
      status: this.mapStatus(response.data.status),
      amount: response.data.amount,
      currency: response.data.currency,
      paidAt: response.data.created_at ? new Date(response.data.created_at) : null,
      providerTransactionId: String(response.data.id),
      raw: response.data,
    };
  }

  verifyWebhookSignature(_rawBody: Buffer, signature: string | undefined): boolean {
    // Flutterwave doesn't HMAC-sign webhooks - it echoes back a secret hash
    // you configure in the dashboard, verbatim, in the `verif-hash` header.
    if (!signature) return false;
    const expected = this.configService.get<string>('flutterwave.webhookHash');
    if (!expected) return false;

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhookEvent(body: unknown): WebhookEvent | null {
    const payload = body as FlutterwaveWebhookBody;
    const reference = payload?.data?.tx_ref;
    if (!reference) return null;

    if (payload.event === 'charge.completed') {
      return {
        reference,
        status: payload.data?.status === 'successful' ? 'success' : 'failed',
      };
    }
    return null;
  }

  async refund(reference: string, providerTransactionId?: string): Promise<RefundResult> {
    const transactionId = providerTransactionId ?? (await this.verify(reference)).providerTransactionId;
    if (!transactionId) {
      return { status: 'failed', raw: { message: 'No provider transaction id to refund' } };
    }

    const response = await this.request<{ status: string; message: string; data?: unknown }>(
      `/transactions/${encodeURIComponent(transactionId)}/refund`,
      'POST',
    );

    return { status: response.status === 'success' ? 'success' : 'failed', raw: response };
  }

  private mapStatus(status: string): ProviderChargeStatus {
    if (status === 'successful') return 'success';
    if (status === 'failed') return 'failed';
    return 'pending';
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const secretKey = this.configService.get<string>('flutterwave.secretKey');
    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Flutterwave is not configured - set FLUTTERWAVE_SECRET_KEY',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${FLUTTERWAVE_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Flutterwave request to ${path} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Could not reach Flutterwave');
    }

    const payload = (await response.json().catch(() => null)) as T | null;
    if (!payload) {
      throw new ServiceUnavailableException('Flutterwave returned an invalid response');
    }

    return payload;
  }
}
