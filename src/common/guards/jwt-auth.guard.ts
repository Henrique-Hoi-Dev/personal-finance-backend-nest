import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// TODO: Implementar autenticação JWT real
// Este é um stub placeholder para substituir verifyToken do Express
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO: Implementar verificação de token JWT
    return true;
  }
}
