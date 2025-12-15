import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CurrencyCode, LanguageCode } from '@prisma/client';

export class UpdateUserProfileDto {
  @IsString()
  @Length(2, 100)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(CurrencyCode)
  @IsOptional()
  defaultCurrency?: CurrencyCode;

  @IsEnum(LanguageCode)
  @IsOptional()
  preferredLanguage?: LanguageCode;
}

export class UpdateUserStatusDto {
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  emailVerified?: boolean;
}
