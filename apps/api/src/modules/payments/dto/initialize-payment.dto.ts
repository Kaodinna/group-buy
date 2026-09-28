import { IsEnum, IsMongoId } from 'class-validator';
import { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';

export class InitializePaymentDto {
  @IsMongoId()
  participantId!: string;

  @IsEnum(PaymentProviderName)
  provider!: PaymentProviderName;
}
