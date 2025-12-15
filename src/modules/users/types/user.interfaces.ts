import { CurrencyCode, LanguageCode } from '@prisma/client';

export interface UserSafe {
  id: string;
  cpf: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: Date | null;
  defaultCurrency: CurrencyCode;
  preferredLanguage: LanguageCode;
  pluggyItemId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  cpf: string;
  name: string;
  email: string;
  hashPassword: string; // already hashed, no raw password here
  defaultCurrency?: CurrencyCode;
  preferredLanguage?: LanguageCode;
  pluggyItemId?: string | null;
}

export interface UpdateUserProfileInput {
  name?: string;
  defaultCurrency?: CurrencyCode;
  preferredLanguage?: LanguageCode;
}

export interface UpdateUserStatusInput {
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserListFilters {
  search?: string; // optional: by name/email/cpf
  isActive?: boolean;
  emailVerified?: boolean;
  defaultCurrency?: CurrencyCode;
  preferredLanguage?: LanguageCode;
  limit?: number;
  page?: number;
}

export interface UserProfile extends UserSafe {
  avatarId?: string | null;
}

export interface UpdateUserProfileInput {
  name?: string;
  email?: string;
  defaultCurrency?: CurrencyCode;
  preferredLanguage?: LanguageCode;
}

export interface RegisterUserInput {
  cpf: string;
  name: string;
  email: string;
  password: string;
  defaultCurrency?: CurrencyCode;
  preferredLanguage?: LanguageCode;
}

export interface LoginInput {
  cpf: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface PluggyConnectTokenOptions {
  itemId?: string;
}
