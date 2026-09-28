import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { slugify } from '../../common/utils/slugify.util.js';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  async findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = slugify(dto.name);
    const existing = await this.categoryModel.exists({ slug });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.categoryModel.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      image: dto.image ?? null,
    });
  }
}
