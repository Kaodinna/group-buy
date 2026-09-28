import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          (result as { success: unknown }).success === true
        ) {
          return result as ApiSuccessResponse<T>;
        }

        const { message, data } = this.normalize(result);
        return { success: true, message, data };
      }),
    );
  }

  private normalize(result: unknown): { message: string; data: T } {
    if (
      result &&
      typeof result === 'object' &&
      'message' in result &&
      'data' in result
    ) {
      const { message, data } = result as { message: string; data: T };
      return { message, data };
    }

    return { message: 'Request successful', data: result as T };
  }
}
