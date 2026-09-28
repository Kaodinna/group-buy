import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception.js';

interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (this.extractExpressErrorStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const code =
      exception instanceof AppException
        ? exception.code
        : this.defaultCode(status);

    const message = this.extractMessage(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.id ?? 'no-request-id'}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = { success: false, message, code };
    response.status(status).json(body);
  }

  private extractMessage(exception: unknown, status: number): string {
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      // Overrides the throttler's default "ThrottlerException: Too Many
      // Requests" wording, which leaks the internal exception class name.
      return 'Too many requests. Please try again later.';
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const msg = (response as { message: unknown }).message;
        return Array.isArray(msg) ? msg.join(', ') : String(msg);
      }
      return exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    return exception instanceof Error ? exception.message : 'Unexpected error';
  }

  /**
   * Errors thrown by Express-level middleware (body-parser's "request
   * entity too large", malformed JSON, etc.) run before any Nest handler
   * sees the request, so they're plain Errors with a `status`/`statusCode`
   * property, not HttpException instances. Recognize that convention so
   * these surface as their real 4xx status instead of a generic 500.
   */
  private extractExpressErrorStatus(exception: unknown): number | undefined {
    if (typeof exception !== 'object' || exception === null) return undefined;

    const candidate =
      (exception as { status?: unknown; statusCode?: unknown }).status ??
      (exception as { status?: unknown; statusCode?: unknown }).statusCode;

    if (typeof candidate === 'number' && candidate >= 400 && candidate < 600) {
      return candidate;
    }
    return undefined;
  }

  private defaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
