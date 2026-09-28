import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { ProductStatus } from '../../common/enums/product-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { slugify, randomSlugSuffix } from '../../common/utils/slugify.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<ProductDocument> {
    const slug = await this.generateUniqueSlug(dto.name);

    return this.productModel.create({
      sellerId: new Types.ObjectId(sellerId),
      name: dto.name,
      slug,
      description: dto.description,
      categoryId: new Types.ObjectId(dto.categoryId),
      originalPrice: dto.originalPrice,
      stock: dto.stock,
      images: dto.images ?? [],
      specifications: dto.specifications ?? {},
      status: ProductStatus.PENDING,
    });
  }

  async findAll(
    query: QueryProductsDto,
    requester?: AuthenticatedUser,
  ): Promise<PaginatedResult<ProductDocument>> {
    const filter: QueryFilter<Product> = {};

    if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
    if (query.sellerId) filter.sellerId = new Types.ObjectId(query.sellerId);
    if (query.status && requester?.role === Role.ADMIN) filter.status = query.status;

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.minPrice || query.maxPrice) {
      filter.originalPrice = {
        ...(query.minPrice ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice ? { $lte: query.maxPrice } : {}),
      };
    }

    this.applyVisibilityScope(filter, requester, query.sellerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const sort = this.resolveSort(query.sort);

    const isAdmin = requester?.role === Role.ADMIN;
    const [items, total] = await Promise.all([
      (isAdmin
        ? this.productModel.find(filter).populate('sellerId', 'firstName lastName email')
        : this.productModel.find(filter)
      )
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findByIdOrSlug(
    idOrSlug: string,
    requester?: AuthenticatedUser,
  ): Promise<ProductDocument> {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const product = await this.productModel
      .findOne(isObjectId ? { _id: idOrSlug } : { slug: idOrSlug })
      .exec();

    if (!product || !this.isVisibleTo(product, requester)) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    requester: AuthenticatedUser,
  ): Promise<ProductDocument> {
    const product = await this.findOwnedOrAdmin(id, requester);

    const isAdmin = requester.role === Role.ADMIN;
    const { status, ...editableFields } = dto;

    // dto may carry every declared field as `undefined` (class-transformer
    // sets absent properties explicitly), so only apply the ones the caller
    // actually sent - Object.assign(product, dto) would null out the rest.
    for (const [key, value] of Object.entries(editableFields)) {
      if (value !== undefined) {
        (product as unknown as Record<string, unknown>)[key] = value;
      }
    }

    const previousStatus = product.status;
    if (status !== undefined && isAdmin) {
      product.status = status;
    }

    await product.save();

    if (isAdmin && status !== undefined && status !== previousStatus) {
      if (status === ProductStatus.ACTIVE) {
        await this.notificationsService.notify(
          product.sellerId,
          NotificationType.PRODUCT_APPROVED,
          'Product approved',
          `Your product "${product.name}" has been approved and is now live.`,
          { productId: product._id.toString() },
        );
      } else if (status === ProductStatus.REJECTED) {
        await this.notificationsService.notify(
          product.sellerId,
          NotificationType.PRODUCT_REJECTED,
          'Product rejected',
          `Your product "${product.name}" was not approved. Please review and resubmit.`,
          { productId: product._id.toString() },
        );
      }
    }

    return product;
  }

  async remove(id: string, requester: AuthenticatedUser): Promise<void> {
    const product = await this.findOwnedOrAdmin(id, requester);
    product.status = ProductStatus.ARCHIVED;
    await product.save();
  }

  private async findOwnedOrAdmin(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    const isOwner = product.sellerId.toString() === requester.userId;
    if (!isOwner && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to modify this product');
    }

    return product;
  }

  private applyVisibilityScope(
    filter: QueryFilter<Product>,
    requester: AuthenticatedUser | undefined,
    requestedSellerId: string | undefined,
  ): void {
    if (requester?.role === Role.ADMIN) return;

    const isOwnSellerListing =
      requester && requestedSellerId && requester.userId === requestedSellerId;

    if (isOwnSellerListing) return;

    filter.status = ProductStatus.ACTIVE;
  }

  private isVisibleTo(product: ProductDocument, requester?: AuthenticatedUser): boolean {
    if (product.status === ProductStatus.ACTIVE) return true;
    if (!requester) return false;
    if (requester.role === Role.ADMIN) return true;
    return product.sellerId.toString() === requester.userId;
  }

  private resolveSort(sort: QueryProductsDto['sort']): Record<string, 1 | -1> {
    switch (sort) {
      case 'price_asc':
        return { originalPrice: 1 };
      case 'price_desc':
        return { originalPrice: -1 };
      default:
        return { createdAt: -1 };
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'product';

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${randomSlugSuffix()}`;
      const existing = await this.productModel.exists({ slug: candidate });
      if (!existing) return candidate;
    }

    return `${base}-${randomSlugSuffix(10)}`;
  }
}
