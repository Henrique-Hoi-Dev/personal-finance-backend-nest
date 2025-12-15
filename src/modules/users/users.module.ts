import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserAvatarService } from './user-avatar.service';
import { UserAvatarController } from './user-avatar.controller';

@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, UserAvatarController],
  providers: [UsersService, UserAvatarService],
  exports: [UsersService, UserAvatarService],
})
export class UsersModule {}
