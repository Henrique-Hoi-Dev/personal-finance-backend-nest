import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// TODO: Implementar verificação de roles
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO: Implementar verificação de roles
    return true;
  }
}
