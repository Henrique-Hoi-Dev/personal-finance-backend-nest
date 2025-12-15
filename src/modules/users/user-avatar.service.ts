import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UserAvatar } from '@prisma/client';
import { promises as fs } from 'fs';

@Injectable()
export class UserAvatarService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserAvatar> {
    if (!file) {
      throw new BadRequestException('FILE_NOT_FOUND');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Check if avatar already exists
    const existing = await this.prisma.userAvatar.findFirst({
      where: { userId },
    });

    if (existing) {
      const oldPath = existing.storagePath;

      // Update existing avatar
      const updated = await this.prisma.userAvatar.update({
        where: { id: existing.id },
        data: {
          originalName: file.originalname,
          fileName: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.path,
          deletedAt: null, // Restore if soft deleted
        },
      });

      // Delete old file if path is different
      if (oldPath && oldPath !== file.path) {
        try {
          await fs.unlink(oldPath);
        } catch {
          // Ignore file deletion errors
        }
      }

      return updated;
    }

    // Create new avatar
    const created = await this.prisma.userAvatar.create({
      data: {
        userId,
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
      },
    });

    return created;
  }

  async getProfileAvatarRaw(userId: string): Promise<UserAvatar> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const avatar = await this.prisma.userAvatar.findFirst({
      where: { userId, deletedAt: null },
    });

    if (!avatar) {
      throw new NotFoundException('USER_AVATAR_NOT_FOUND');
    }

    return avatar;
  }

  async getAvatarFile(userId: string): Promise<{
    fileBuffer: Buffer;
    mimeType: string;
    originalName: string;
  }> {
    const avatar = await this.getProfileAvatarRaw(userId);

    try {
      const fileBuffer: Buffer = await fs.readFile(avatar.storagePath);
      return {
        fileBuffer,
        mimeType: avatar.mimeType,
        originalName: avatar.originalName,
      };
    } catch {
      throw new NotFoundException('AVATAR_FILE_READ_ERROR');
    }
  }
}
