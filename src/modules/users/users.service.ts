import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { User, CurrencyCode, LanguageCode, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserProfileInput,
  UpdateUserStatusInput,
  UserListFilters,
  UserSafe,
  UserProfile,
  PluggyConnectTokenOptions,
} from './types/user.interfaces';
import { PluggyIntegrationService } from '../integrations/pluggy/pluggy-integration.service';
import { InternalServerErrorException } from '@nestjs/common';
import { PluggyConnectTokenResponse } from '../integrations/pluggy/pluggy.types';
import { PaginationResult } from '../../shared/types/pagination.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyIntegration: PluggyIntegrationService,
  ) {}

  private toSafeUser(user: User): UserSafe {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashPassword, ...safe } = user;
    return safe as UserSafe;
  }

  async create(dto: CreateUserDto): Promise<UserSafe> {
    // Enforce legacy rule: hashPassword must be provided
    if (!dto.hashPassword) {
      throw new BadRequestException('Password is required for user creation');
    }

    // Check for cpf/email duplication explicitly before create
    const existingCpf = await this.findByCpf(dto.cpf);
    if (existingCpf) {
      throw new BadRequestException('CPF already exists');
    }

    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const data: Prisma.UserCreateInput = {
      cpf: dto.cpf,
      name: dto.name,
      email: dto.email,
      hashPassword: dto.hashPassword,
      defaultCurrency: dto.defaultCurrency ?? CurrencyCode.BRL,
      preferredLanguage: dto.preferredLanguage ?? LanguageCode.pt_BR,
      pluggyItemId: dto.pluggyItemId ?? null,
    };

    const created = await this.prisma.user.create({ data });

    return this.toSafeUser(created);
  }

  async findById(id: string): Promise<UserSafe> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return this.toSafeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const where: Prisma.UserWhereInput = { email, deletedAt: null };
    return await this.prisma.user.findFirst({ where });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    const where: Prisma.UserWhereInput = { cpf, deletedAt: null };
    return await this.prisma.user.findFirst({ where });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    return await this.prisma.user.findFirst({ where });
  }

  async updatePassword(id: string, hashPassword: string): Promise<void> {
    const data: Prisma.UserUpdateInput = { hashPassword };
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateLastLogout(id: string): Promise<void> {
    const data: Prisma.UserUpdateInput = { lastLogout: new Date() };
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async list(
    filters: UserListFilters = {},
  ): Promise<PaginationResult<UserSafe>> {
    const {
      search,
      isActive,
      emailVerified,
      defaultCurrency,
      preferredLanguage,
      limit = 10,
      page = 1,
    } = filters;

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (typeof emailVerified === 'boolean') {
      where.emailVerified = emailVerified;
    }

    if (defaultCurrency) {
      where.defaultCurrency = defaultCurrency;
    }

    if (preferredLanguage) {
      where.preferredLanguage = preferredLanguage;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ] as Prisma.UserWhereInput['OR'];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const docs = users.map((u) => this.toSafeUser(u));

    return {
      docs,
      total,
      limit: take,
      page: Number(page),
      offset: skip,
      hasNextPage: skip + take < total,
      hasPrevPage: Number(page) > 1,
    };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const where: Prisma.UserWhereInput = { id: userId, deletedAt: null };
    const include: Prisma.UserInclude = { avatar: true };
    const user = await this.prisma.user.findFirst({
      where,
      include,
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const safeUser = this.toSafeUser(user);
    return {
      ...safeUser,
      avatarId: user.avatar?.id ?? null,
    };
  }

  async updateProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    const include: Prisma.UserInclude = { avatar: true };
    const user = await this.prisma.user.findFirst({
      where,
      include,
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Only allow safe fields to be updated
    const allowedFields: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) {
      allowedFields.name = input.name;
    }
    if (input.email !== undefined) {
      allowedFields.email = input.email;
    }
    if (input.defaultCurrency !== undefined) {
      allowedFields.defaultCurrency = input.defaultCurrency;
    }
    if (input.preferredLanguage !== undefined) {
      allowedFields.preferredLanguage = input.preferredLanguage;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: allowedFields,
      include,
    });

    const safeUser = this.toSafeUser(updated);
    return {
      ...safeUser,
      avatarId: updated.avatar?.id ?? null,
    };
  }

  async createWithHash(userData: {
    cpf: string;
    name: string;
    email: string;
    hashPassword: string;
    defaultCurrency?: CurrencyCode;
    preferredLanguage?: LanguageCode;
  }): Promise<UserSafe> {
    const data: Prisma.UserCreateInput = {
      cpf: userData.cpf,
      name: userData.name,
      email: userData.email,
      hashPassword: userData.hashPassword,
      defaultCurrency: userData.defaultCurrency ?? CurrencyCode.BRL,
      preferredLanguage: userData.preferredLanguage ?? LanguageCode.pt_BR,
    };

    const created = await this.prisma.user.create({ data });

    return this.toSafeUser(created);
  }

  async updateStatus(
    id: string,
    input: UpdateUserStatusInput,
  ): Promise<UserSafe> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const data: Prisma.UserUpdateInput = {
      isActive: input.isActive ?? user.isActive,
      emailVerified: input.emailVerified ?? user.emailVerified,
    };

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toSafeUser(updated);
  }

  async markEmailVerified(id: string): Promise<UserSafe> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const data: Prisma.UserUpdateInput = { emailVerified: true };
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toSafeUser(updated);
  }

  async updateLastLogin(id: string, date: Date = new Date()): Promise<void> {
    const data: Prisma.UserUpdateInput = { lastLogin: date };
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<void> {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const data: Prisma.UserUpdateInput = {
      deletedAt: new Date(),
      isActive: false,
    };
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePluggyItemId(userId: string, itemId: string): Promise<void> {
    const where: Prisma.UserWhereInput = { id: userId, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const data: Prisma.UserUpdateInput = { pluggyItemId: itemId };
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async getPluggyItemId(userId: string): Promise<string | null> {
    const where: Prisma.UserWhereInput = { id: userId, deletedAt: null };
    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return user.pluggyItemId ?? null;
  }

  async createPluggyConnectToken(
    userId: string,
    options: PluggyConnectTokenOptions = {},
  ): Promise<PluggyConnectTokenResponse> {
    try {
      const payload = {
        clientUserId: String(userId),
        ...(options.itemId && { itemId: options.itemId }),
      };

      const response = await this.pluggyIntegration.createConnectToken(payload);
      return response;
    } catch {
      throw new InternalServerErrorException(
        'PLUGGY_CONNECT_TOKEN_CREATION_ERROR',
      );
    }
  }
}
