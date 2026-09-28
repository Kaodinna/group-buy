import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, status);
    this.code = code;
  }
}
