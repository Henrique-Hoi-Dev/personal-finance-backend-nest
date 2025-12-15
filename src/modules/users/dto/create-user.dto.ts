import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CurrencyCode, LanguageCode } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @Length(11, 11)
  cpf: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  hashPassword: string; // already hashed

  @IsEnum(CurrencyCode)
  @IsOptional()
  defaultCurrency?: CurrencyCode;

  @IsEnum(LanguageCode)
  @IsOptional()
  preferredLanguage?: LanguageCode;

  @IsString()
  @IsOptional()
  pluggyItemId?: string;
}
