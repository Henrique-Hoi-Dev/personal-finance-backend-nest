import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// TODO: Implementar verificação de roles/autorização real
// Este é um stub placeholder para substituir ensureAuthorization do Express
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO: Implementar verificação de autorização/roles
    return true;
  }
}
