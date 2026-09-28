import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    const result = await this.productsService.findAll(query, requester);
    return { message: 'Products retrieved', data: result };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    const product = await this.productsService.findByIdOrSlug(idOrSlug, requester);
    return { message: 'Product retrieved', data: product };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post()
  async create(@CurrentUser('userId') sellerId: string, @Body() dto: CreateProductDto) {
    const product = await this.productsService.create(sellerId, dto);
    return { message: 'Product created and pending approval', data: product };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const product = await this.productsService.update(id, dto, requester);
    return { message: 'Product updated', data: product };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() requester: AuthenticatedUser) {
    await this.productsService.remove(id, requester);
    return { message: 'Product archived', data: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image file provided');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uploaded = await this.cloudinaryService.uploadImage(file);
    return { message: 'Image uploaded', data: uploaded };
  }
}
