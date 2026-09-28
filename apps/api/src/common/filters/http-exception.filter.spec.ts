import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { AppException } from '../exceptions/app.exception.js';

function makeHost(requestId?: string) {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const request = { id: requestId };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('replaces the throttler default message so it does not leak the exception class name', () => {
    const { host, response } = makeHost();

    filter.catch(new ThrottlerException(), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('never puts a stack trace in the response body for a 500', () => {
    const { host, response } = makeHost();

    filter.catch(new Error('a leaked internal detail'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  it('surfaces an AppException code and message verbatim', () => {
    const { host, response } = makeHost();

    filter.catch(new AppException('Only a successful payment can be refunded', 'PAYMENT_NOT_REFUNDABLE', HttpStatus.CONFLICT), host);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Only a successful payment can be refunded',
      code: 'PAYMENT_NOT_REFUNDABLE',
    });
  });

  it('preserves validation error messages for a 400', () => {
    const { host, response } = makeHost();

    filter.catch(new BadRequestException('email must be a valid email'), host);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'email must be a valid email',
      code: 'BAD_REQUEST',
    });
  });
});
