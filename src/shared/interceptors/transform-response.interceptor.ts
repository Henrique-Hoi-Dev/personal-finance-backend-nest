import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Generic API response wrapper type
 */
export type ApiResponse<T> = {
  data: T;
};

/**
 * Global response transformation interceptor
 *
 * Wraps all HTTP responses in { data: ... } structure.
 * For non-HTTP contexts (microservices/RPC), passes through without transformation.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle() as Observable<ApiResponse<T> | T>;
    }

    return next.handle().pipe(
      map((data) => {
        // Don't wrap null/undefined (for 204 No Content)
        if (data === undefined || data === null) {
          return data;
        }

        // Don't wrap if already has "data" property (prevents double-wrapping)
        if (
          typeof data === 'object' &&
          data !== null &&
          'data' in (data as Record<string, unknown>)
        ) {
          return data as ApiResponse<T> | T;
        }

        // Default: wrap in { data: ... }
        return { data } as ApiResponse<T>;
      }),
    );
  }
}
