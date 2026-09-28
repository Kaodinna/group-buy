import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { message: 'Categories retrieved', data: categories };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto);
    return { message: 'Category created', data: category };
  }
}
