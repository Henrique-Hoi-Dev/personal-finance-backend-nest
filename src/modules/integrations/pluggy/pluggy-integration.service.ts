import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { Integration } from '../integration';
import {
  PluggyAccountResponse,
  PluggyConnectTokenRequest,
  PluggyConnectTokenResponse,
} from './pluggy.types';

@Injectable()
export class PluggyIntegrationService extends Integration {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super(httpService);
    this.baseUrl = this.configService.getOrThrow<string>('PLUGGY_BASE_URL');
    this.apiKey = this.configService.getOrThrow<string>('PLUGGY_API_KEY');
  }

  private getAuthHeaders(): Record<string, string> {
    return { 'X-API-KEY': this.apiKey };
  }

  async getAccounts(itemId: string): Promise<PluggyAccountResponse> {
    const url = `${this.baseUrl}/accounts?itemId=${itemId}`;
    const config: AxiosRequestConfig = {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    };

    return this.get<PluggyAccountResponse>(url, config, {
      provider: 'pluggy',
      method: 'GET',
      url,
    });
  }

  async createConnectToken(
    payload: PluggyConnectTokenRequest,
  ): Promise<PluggyConnectTokenResponse> {
    const url = `${this.baseUrl}/connect_token`;
    const config: AxiosRequestConfig = {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    };

    return this.post<PluggyConnectTokenResponse, PluggyConnectTokenRequest>(
      url,
      payload,
      config,
      {
        provider: 'pluggy',
        method: 'POST',
        url,
      },
    );
  }
}
