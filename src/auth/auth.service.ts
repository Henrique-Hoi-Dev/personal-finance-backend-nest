import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { validatePasswordStrength } from '../shared/utils/password-strength.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validatePassword(raw: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(raw, hash);
      return isValid;
    } catch (error) {
      throw new InternalServerErrorException('PASSWORD_VALIDATION_ERROR');
    }
  }

  async register(dto: RegisterUserDto): Promise<{ accessToken: string }> {
    // Check if cpf already exists
    const existingCpf = await this.usersService.findByCpf(dto.cpf);
    if (existingCpf) {
      throw new ConflictException('CPF_ALREADY_EXISTS');
    }

    // Check if email already exists
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength({
      password: dto.password,
    });
    if (!passwordValidation.isValid) {
      throw new BadRequestException('WEAK_PASSWORD');
    }

    // Hash password
    const saltRounds = 8;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create user with hashed password
    const user = await this.usersService.createWithHash({
      cpf: dto.cpf,
      name: dto.name,
      email: dto.email,
      hashPassword: hashedPassword,
      defaultCurrency: dto.defaultCurrency,
      preferredLanguage: dto.preferredLanguage,
    });

    // Generate JWT token
    const accessToken = this.jwtService.sign({ userId: user.id });

    return { accessToken };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByCpf(dto.cpf);
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ForbiddenException('USER_INACTIVE');
    }

    // Access hashPassword from Prisma User type
    const userWithPassword = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });

    if (!userWithPassword) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValidPassword = await this.validatePassword(
      dto.password,
      userWithPassword.hashPassword,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    // Update lastLogin
    await this.usersService.updateLastLogin(user.id);

    // Generate JWT token
    const accessToken = this.jwtService.sign({ userId: user.id });

    return { accessToken };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    // Check current password
    const isCurrentValid = await this.validatePassword(
      input.currentPassword,
      user.hashPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('INVALID_CURRENT_PASSWORD');
    }

    // Validate new password
    if (typeof input.newPassword !== 'string' || input.newPassword.length < 6) {
      throw new BadRequestException('WEAK_PASSWORD');
    }

    // Hash new password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(input.newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashPassword: newHash },
    });

    return { message: 'Senha atualizada com sucesso' };
  }

  async logout(userId: string): Promise<{
    message: string;
    timestamp: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLogout: new Date() },
      });
    }

    return {
      message: 'Logout realizado com sucesso',
      timestamp: new Date().toISOString(),
    };
  }
}
