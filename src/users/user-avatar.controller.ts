import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserAvatarService } from './user-avatar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserAvatarController {
  constructor(private readonly userAvatarService: UserAvatarService) {}

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(
    @Param('id', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userAvatarService.updateProfileAvatar(userId, file);
  }

  @Get(':id/avatar')
  @Header('Content-Type', 'application/octet-stream')
  async getAvatar(
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<StreamableFile> {
    const avatarData = await this.userAvatarService.getAvatarFile(userId);

    return new StreamableFile(avatarData.fileBuffer, {
      type: avatarData.mimeType,
      disposition: `inline; filename="${avatarData.originalName}"`,
    });
  }
}

