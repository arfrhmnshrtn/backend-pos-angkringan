import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan pada server';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) || exception.message;

        // Handle class-validator errors
        if (Array.isArray(responseObj['message'])) {
          message = 'Validasi gagal';
          errors = this.formatValidationErrors(responseObj['message'] as string[]);
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('Unknown exception caught', String(exception));
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      message,
      ...(errors && { errors }),
    };

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const msg of messages) {
      const key = 'validation';
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(msg);
    }
    return errors;
  }
}
