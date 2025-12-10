import { Injectable } from '@nestjs/common';

@Injectable()
export class PluggyService {
  getAccounts(_itemId: string): Promise<unknown> {
    // TODO: Implementar integração com Pluggy Open Finance API
    // Wrapper para PluggyClientIntegration.getAccounts
    return Promise.reject(
      new Error('Not implemented yet - Pluggy integration not available'),
    );
  }
}
