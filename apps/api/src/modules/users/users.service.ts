import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { Role } from '../../common/enums/role.enum.js';
import { generateReferralCode } from '../../common/utils/referral-code.util.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { QueryUsersDto } from './dto/query-users.dto.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  referralCode: string;
  referredBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  referredBy?: Types.ObjectId | null;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByEmail(email: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+password');
    return query.exec();
  }

  async findByReferralCode(referralCode: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ referralCode: referralCode.toUpperCase() }).exec();
  }

  async findById(id: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findById(id);
    if (withPassword) query.select('+password');
    return query.exec();
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const referralCode = await this.generateUniqueReferralCode(input.firstName);

    return this.userModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      password: input.passwordHash,
      role: input.role,
      referralCode,
      referredBy: input.referredBy ?? null,
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }).exec();
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<UserDocument>> {
    const filter: QueryFilter<User> = {};
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      const pattern = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /** Suspending a user also bumps tokenVersion, invalidating any session
   * they're currently logged into immediately rather than at next expiry. */
  async setActiveStatus(id: string, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    if (!isActive) user.tokenVersion += 1;
    await user.save();
    return user;
  }

  private async generateUniqueReferralCode(firstName: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode(firstName);
      const existing = await this.userModel.exists({ referralCode: code });
      if (!existing) return code;
    }
    throw new ConflictException('Could not generate a unique referral code, please retry');
  }

  toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar ?? null,
      isVerified: user.isVerified,
      isActive: user.isActive,
      referralCode: user.referralCode,
      referredBy: user.referredBy ? user.referredBy.toString() : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
