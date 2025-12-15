import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  // Add other properties from your JWT payload if needed
}

interface RequestWithUser {
  user?: CurrentUserPayload;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new Error(
        'User not found in request. Ensure JwtAuthGuard is applied.',
      );
    }
    return request.user;
  },
);
