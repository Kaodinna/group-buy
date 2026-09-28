import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return { message: 'Profile retrieved', data: this.usersService.toPublicUser(user) };
  }

  @Patch('me')
  async updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return { message: 'Profile updated', data: this.usersService.toPublicUser(user) };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.usersService.findAll(query);
    return {
      message: 'Users retrieved',
      data: { ...result, items: result.items.map((u) => this.usersService.toPublicUser(u)) },
    };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    const user = await this.usersService.setActiveStatus(id, dto.isActive);
    return { message: 'User status updated', data: this.usersService.toPublicUser(user) };
  }
}
