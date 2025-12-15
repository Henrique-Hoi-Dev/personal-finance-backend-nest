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
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { validatePasswordStrength } from '../../shared/utils/password-strength.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validatePassword(raw: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(raw, hash);
      return isValid;
    } catch {
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

    // Validate password using hashPassword from user
    const isValidPassword = await this.validatePassword(
      dto.password,
      user.hashPassword,
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
    const user = await this.usersService.findByIdWithPassword(userId);

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

    // Validate new password strength
    const passwordValidation = validatePasswordStrength({
      password: input.newPassword,
    });
    if (!passwordValidation.isValid) {
      throw new BadRequestException('WEAK_PASSWORD');
    }

    // Hash new password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(input.newPassword, saltRounds);

    // Update password
    await this.usersService.updatePassword(userId, newHash);

    return { message: 'Senha atualizada com sucesso' };
  }

  async logout(userId: string): Promise<{
    message: string;
    timestamp: string;
  }> {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (user) {
      await this.usersService.updateLastLogout(userId);
    }

    return {
      message: 'Logout realizado com sucesso',
      timestamp: new Date().toISOString(),
    };
  }
}
