import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface IntegrationRequestContext {
  method: string;
  url: string;
  provider: string;
}

@Injectable()
export abstract class Integration {
  protected readonly logger: Logger;

  constructor(protected readonly httpService: HttpService) {
    this.logger = new Logger(this.constructor.name);
  }

  protected async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
    ctx?: Partial<IntegrationRequestContext>,
  ): Promise<T> {
    return this.request<T>(
      {
        ...config,
        method: 'GET',
        url,
      },
      ctx,
    );
  }

  protected async post<T = unknown, B = unknown>(
    url: string,
    body: B,
    config?: AxiosRequestConfig,
    ctx?: Partial<IntegrationRequestContext>,
  ): Promise<T> {
    return this.request<T>(
      {
        ...config,
        method: 'POST',
        url,
        data: body,
      },
      ctx,
    );
  }

  private async request<T>(
    config: AxiosRequestConfig & { method: string; url: string },
    ctx?: Partial<IntegrationRequestContext>,
  ): Promise<T> {
    const fullContext: IntegrationRequestContext = {
      method: config.method,
      url: config.url || '',
      provider: ctx?.provider || 'unknown',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>(config),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, fullContext);
    }
  }

  protected handleError(error: unknown, ctx: IntegrationRequestContext): never {
    const axiosError = error as AxiosError;

    if (axiosError.isAxiosError) {
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;
      const responseData = axiosError.response?.data;

      // Stringify response data if it's an object
      let responseDataStr: string;
      try {
        if (responseData === null || responseData === undefined) {
          responseDataStr = '';
        } else if (typeof responseData === 'string') {
          responseDataStr = responseData;
        } else if (
          typeof responseData === 'number' ||
          typeof responseData === 'boolean' ||
          typeof responseData === 'bigint'
        ) {
          responseDataStr = String(responseData);
        } else {
          // For objects and arrays, use JSON.stringify
          responseDataStr = JSON.stringify(responseData);
        }
      } catch {
        responseDataStr = '[Unable to stringify response data]';
      }

      this.logger.error(
        `[${ctx.provider.toUpperCase()}] Integration error: ${ctx.method} ${ctx.url} - Status: ${status || 'UNKNOWN'} ${statusText || ''}`,
        {
          provider: ctx.provider,
          method: ctx.method,
          url: ctx.url,
          status,
          statusText,
          responseData: responseDataStr,
          message: axiosError.message,
          stack: axiosError.stack,
        },
      );

      throw new Error(`${ctx.provider.toUpperCase()}_INTEGRATION_ERROR`);
    }

    const unknownError = error as Error;
    this.logger.error(
      `[${ctx.provider.toUpperCase()}] Unexpected error: ${ctx.method} ${ctx.url} - ${unknownError.message}`,
      {
        provider: ctx.provider,
        method: ctx.method,
        url: ctx.url,
        message: unknownError.message,
        stack: unknownError.stack,
      },
    );

    throw new Error(`${ctx.provider.toUpperCase()}_INTEGRATION_ERROR`);
  }
}
