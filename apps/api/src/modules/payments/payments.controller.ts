import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service.js';
import { InitializePaymentDto } from './dto/initialize-payment.dto.js';
import { QueryPaymentsDto } from './dto/query-payments.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PaymentProviderName } from '../../common/enums/payment-provider-name.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  async initialize(
    @Body() dto: InitializePaymentDto,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.paymentsService.initialize(userId, dto);
    return { message: 'Payment initialized', data: result };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAll(@Query() query: QueryPaymentsDto) {
    const result = await this.paymentsService.findAll(query);
    return { message: 'Payments retrieved', data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':reference')
  async getByReference(
    @Param('reference') reference: string,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const payment = await this.paymentsService.getByReference(reference, requester);
    return { message: 'Payment retrieved', data: payment };
  }

  // Providers can burst-retry undelivered webhooks from a shared IP range;
  // the per-IP default throttle would drop legitimate retries. The
  // signature check inside handleWebhook() is the real defense here.
  @SkipThrottle()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing request body');
    await this.paymentsService.handleWebhook(
      PaymentProviderName.PAYSTACK,
      req.rawBody,
      signature,
      req.body,
    );
    return { message: 'Webhook processed', data: { received: true } };
  }

  @SkipThrottle()
  @Post('webhook/flutterwave')
  @HttpCode(HttpStatus.OK)
  async flutterwaveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('verif-hash') signature: string | undefined,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing request body');
    await this.paymentsService.handleWebhook(
      PaymentProviderName.FLUTTERWAVE,
      req.rawBody,
      signature,
      req.body,
    );
    return { message: 'Webhook processed', data: { received: true } };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    const payment = await this.paymentsService.refund(id, requester);
    return { message: 'Refund processed', data: payment };
  }
}
