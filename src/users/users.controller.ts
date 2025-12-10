import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UserAvatarService } from './user-avatar.service';
import { AuthService } from '../auth/auth.service';
import { RegisterUserDto } from '../auth/dto/register-user.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CreatePluggyConnectTokenDto } from './dto/create-pluggy-connect-token.dto';
import { UpdatePluggyItemIdDto } from './dto/update-pluggy-item-id.dto';
import { UserProfile } from './types/user.interfaces';
import { PluggyConnectTokenResponse } from '../integrations/pluggy/pluggy.types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PaginationResult } from '../shared/interfaces/pagination.interface';
import type { UserListFilters } from './types/user.interfaces';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userAvatarService: UserAvatarService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  // Public routes
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterUserDto): Promise<{ accessToken: string }> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto);
  }

  // Protected routes
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: CurrentUserPayload): Promise<UserProfile> {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  updateProfileAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userAvatarService.updateProfileAvatar(user.userId, file);
  }

  @Get('profile/avatar')
  @UseGuards(JwtAuthGuard)
  getProfileAvatar(@CurrentUser() user: CurrentUserPayload) {
    return this.userAvatarService.getProfileAvatarRaw(user.userId);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.userId, dto);
  }

  @Post('pluggy/connect-token')
  @UseGuards(JwtAuthGuard)
  async createPluggyConnectToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePluggyConnectTokenDto,
  ): Promise<PluggyConnectTokenResponse> {
    return await this.usersService.createPluggyConnectToken(user.userId, {
      itemId: dto.itemId,
    });
  }

  @Patch('pluggy/item-id')
  @UseGuards(JwtAuthGuard)
  updatePluggyItemId(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdatePluggyItemIdDto,
  ): Promise<void> {
    return this.usersService.updatePluggyItemId(user.userId, dto.itemId);
  }

  // Admin routes (keep existing for backward compatibility)
  @Get()
  list(
    @Query() filters: UserListFilters,
  ): Promise<PaginationResult<UserProfile>> {
    return this.usersService.list(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfile> {
    return this.usersService.getProfile(id);
  }
}
