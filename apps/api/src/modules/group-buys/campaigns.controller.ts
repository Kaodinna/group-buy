import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { QueryCampaignsDto } from './dto/query-campaigns.dto.js';
import { JoinCampaignDto } from './dto/join-campaign.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@Controller('group-buys')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findAll(
    @Query() query: QueryCampaignsDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    const result = await this.campaignsService.findAll(query, requester);
    return { message: 'Group buys retrieved', data: result };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    const campaign = await this.campaignsService.findByIdOrSlug(idOrSlug, requester);
    return { message: 'Group buy retrieved', data: campaign };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() requester: AuthenticatedUser) {
    const campaign = await this.campaignsService.create(dto, requester);
    return { message: 'Group buy campaign created', data: campaign };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const campaign = await this.campaignsService.update(id, dto, requester);
    return { message: 'Group buy campaign updated', data: campaign };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    await this.campaignsService.remove(id, requester);
    return { message: 'Group buy campaign deleted', data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(
    @Param('id') id: string,
    @Body() dto: JoinCampaignDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const participant = await this.campaignsService.join(id, requester, dto.shippingAddress);
    return { message: 'Successfully joined the group buy - complete payment to confirm your spot', data: participant };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get(':id/participants')
  async participants(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    const participants = await this.campaignsService.listParticipants(id, requester);
    return { message: 'Participants retrieved', data: participants };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    const campaign = await this.campaignsService.cancel(id, requester);
    return { message: 'Group buy campaign cancelled', data: campaign };
  }
}
