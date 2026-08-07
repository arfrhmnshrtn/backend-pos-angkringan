import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { ApiSuccessResponse } from '../interfaces/api-response.interface.js';

interface ResponsePayload<T> {
  readonly message?: string;
  readonly data?: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T | ResponsePayload<T>, ApiSuccessResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | ResponsePayload<T>>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response already has the expected shape with message/data
        if (
          response !== null &&
          response !== undefined &&
          typeof response === 'object' &&
          'message' in response &&
          'data' in response
        ) {
          const payload = response as ResponsePayload<T>;
          return {
            success: true as const,
            message: payload.message ?? 'Success',
            data: payload.data as T,
          };
        }

        // Default wrap
        return {
          success: true as const,
          message: 'Success',
          data: response as T,
        };
      }),
    );
  }
}
