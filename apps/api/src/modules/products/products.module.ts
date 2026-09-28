import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CloudinaryModule,
    NotificationsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
