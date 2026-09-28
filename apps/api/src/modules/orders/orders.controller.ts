import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query() query: QueryOrdersDto, @CurrentUser() requester: AuthenticatedUser) {
    const result = await this.ordersService.findAll(query, requester);
    return { message: 'Orders retrieved', data: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    const order = await this.ordersService.findById(id, requester);
    return { message: 'Order retrieved', data: order };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    const order = await this.ordersService.cancel(id, requester);
    return { message: 'Order cancelled', data: order };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const order = await this.ordersService.updateStatus(id, dto, requester);
    return { message: 'Order status updated', data: order };
  }
}
