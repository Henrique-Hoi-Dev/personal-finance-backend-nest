import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, CurrencyCode, LanguageCode } from '@prisma/client';
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
import { PaginationResult } from '../shared/interfaces/pagination.interface';

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

    const created = await this.prisma.user.create({
      data: {
        cpf: dto.cpf,
        name: dto.name,
        email: dto.email,
        hashPassword: dto.hashPassword,
        defaultCurrency: dto.defaultCurrency ?? CurrencyCode.BRL,
        preferredLanguage: dto.preferredLanguage ?? LanguageCode.pt_BR,
        pluggyItemId: dto.pluggyItemId ?? null,
      },
    });

    return this.toSafeUser(created);
  }

  async findById(id: string): Promise<UserSafe> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return this.toSafeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { cpf, deletedAt: null },
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

    const where: {
      deletedAt: null;
      isActive?: boolean;
      emailVerified?: boolean;
      defaultCurrency?: CurrencyCode;
      preferredLanguage?: LanguageCode;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        cpf?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
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
      ];
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
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { avatar: true },
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
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Only allow safe fields to be updated
    const allowedFields: {
      name?: string;
      email?: string;
      defaultCurrency?: CurrencyCode;
      preferredLanguage?: LanguageCode;
    } = {};

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
      include: { avatar: true },
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
    const created = await this.prisma.user.create({
      data: {
        cpf: userData.cpf,
        name: userData.name,
        email: userData.email,
        hashPassword: userData.hashPassword,
        defaultCurrency: userData.defaultCurrency ?? CurrencyCode.BRL,
        preferredLanguage: userData.preferredLanguage ?? LanguageCode.pt_BR,
      },
    });

    return this.toSafeUser(created);
  }

  async updateStatus(
    id: string,
    input: UpdateUserStatusInput,
  ): Promise<UserSafe> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: input.isActive ?? user.isActive,
        emailVerified: input.emailVerified ?? user.emailVerified,
      },
    });

    return this.toSafeUser(updated);
  }

  async markEmailVerified(id: string): Promise<UserSafe> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        emailVerified: true,
      },
    });

    return this.toSafeUser(updated);
  }

  async updateLastLogin(id: string, date: Date = new Date()): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: date },
    });
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async updatePluggyItemId(userId: string, itemId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { pluggyItemId: itemId },
    });
  }

  async getPluggyItemId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

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
