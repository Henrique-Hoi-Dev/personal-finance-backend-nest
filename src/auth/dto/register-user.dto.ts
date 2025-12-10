import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CurrencyCode, LanguageCode } from '@prisma/client';

export class RegisterUserDto {
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
  password: string;

  @IsEnum(CurrencyCode)
  @IsOptional()
  defaultCurrency?: CurrencyCode;

  @IsEnum(LanguageCode)
  @IsOptional()
  preferredLanguage?: LanguageCode;
}
