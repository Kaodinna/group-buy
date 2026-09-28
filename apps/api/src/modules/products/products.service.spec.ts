import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ProductsService } from './products.service.js';
import { Product } from './schemas/product.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ProductStatus } from '../../common/enums/product-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

function makeProductDoc(overrides: Record<string, unknown> = {}) {
  const doc = {
    _id: new Types.ObjectId(),
    sellerId: new Types.ObjectId(),
    name: 'iPhone 15',
    description: 'A great phone with plenty of storage and a fast chip',
    categoryId: new Types.ObjectId(),
    originalPrice: 1_000_000,
    stock: 10,
    status: ProductStatus.PENDING,
    save: vi.fn(),
    ...overrides,
  };
  doc.save.mockImplementation(async () => doc);
  return doc;
}

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: { findById: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn> };
  let notificationsService: { notify: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    productModel = { findById: vi.fn(), findOne: vi.fn() };
    notificationsService = { notify: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('update', () => {
    it('only overwrites fields that were actually sent', async () => {
      const doc = makeProductDoc();
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: doc.sellerId.toString(),
        email: 'seller@example.com',
        role: Role.SELLER,
        tokenVersion: 0,
      };

      // Simulates what class-transformer produces for `{ stock: 5 }`: every
      // other declared DTO field present as an explicit `undefined`.
      await service.update(
        doc._id.toString(),
        {
          stock: 5,
          name: undefined,
          description: undefined,
          categoryId: undefined,
          originalPrice: undefined,
          images: undefined,
          specifications: undefined,
          status: undefined,
        },
        requester,
      );

      expect(doc.stock).toBe(5);
      expect(doc.name).toBe('iPhone 15');
      expect(doc.description).toContain('great phone');
      expect(doc.save).toHaveBeenCalled();
    });

    it('ignores a status change from a non-admin owner', async () => {
      const doc = makeProductDoc();
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: doc.sellerId.toString(),
        email: 'seller@example.com',
        role: Role.SELLER,
        tokenVersion: 0,
      };

      await service.update(doc._id.toString(), { status: ProductStatus.ACTIVE }, requester);

      expect(doc.status).toBe(ProductStatus.PENDING);
    });

    it('applies a status change from an admin', async () => {
      const doc = makeProductDoc();
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        email: 'admin@example.com',
        role: Role.ADMIN,
        tokenVersion: 0,
      };

      await service.update(doc._id.toString(), { status: ProductStatus.ACTIVE }, requester);

      expect(doc.status).toBe(ProductStatus.ACTIVE);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        doc.sellerId,
        'PRODUCT_APPROVED',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ productId: doc._id.toString() }),
      );
    });

    it('notifies the seller when an admin rejects the product', async () => {
      const doc = makeProductDoc();
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        email: 'admin@example.com',
        role: Role.ADMIN,
        tokenVersion: 0,
      };

      await service.update(doc._id.toString(), { status: ProductStatus.REJECTED }, requester);

      expect(doc.status).toBe(ProductStatus.REJECTED);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        doc.sellerId,
        'PRODUCT_REJECTED',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ productId: doc._id.toString() }),
      );
    });

    it('does not notify when the status is sent but unchanged', async () => {
      const doc = makeProductDoc({ status: ProductStatus.ACTIVE });
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        email: 'admin@example.com',
        role: Role.ADMIN,
        tokenVersion: 0,
      };

      await service.update(doc._id.toString(), { status: ProductStatus.ACTIVE }, requester);

      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('rejects edits from a seller who does not own the product', async () => {
      const doc = makeProductDoc();
      productModel.findById.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        email: 'other-seller@example.com',
        role: Role.SELLER,
        tokenVersion: 0,
      };

      await expect(
        service.update(doc._id.toString(), { stock: 1 }, requester),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByIdOrSlug', () => {
    it('hides a non-active product from an anonymous visitor', async () => {
      const doc = makeProductDoc({ status: ProductStatus.PENDING });
      productModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      await expect(service.findByIdOrSlug('iphone-15')).rejects.toThrow(NotFoundException);
    });

    it('shows a pending product to its owner', async () => {
      const doc = makeProductDoc({ status: ProductStatus.PENDING });
      productModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const requester: AuthenticatedUser = {
        userId: doc.sellerId.toString(),
        email: 'seller@example.com',
        role: Role.SELLER,
        tokenVersion: 0,
      };

      const result = await service.findByIdOrSlug('iphone-15', requester);
      expect(result).toBe(doc);
    });
  });
});
