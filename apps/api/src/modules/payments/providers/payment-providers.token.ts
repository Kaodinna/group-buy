import { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';
import type { PaymentProvider } from '../interfaces/payment-provider.interface.js';

export const PAYMENT_PROVIDERS = 'PAYMENT_PROVIDERS';

export type PaymentProviderMap = Record<PaymentProviderName, PaymentProvider>;
