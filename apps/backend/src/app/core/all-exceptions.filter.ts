import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocurrió un error interno en el servidor';
    let errorCode = 'INTERNAL_ERROR';
    let meta: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();
      message = typeof resContent === 'string' ? resContent : resContent.message || exception.message;
      errorCode = 'HTTP_EXCEPTION';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma DB errors
      errorCode = `DB_PRISMA_${exception.code}`;
      meta = exception.meta;
      
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          status = HttpStatus.BAD_REQUEST;
          const target = (exception.meta?.target as string[])?.join(', ') || 'campos';
          message = `Ya existe un registro con el mismo valor en los campos únicos (${target})`;
          break;
        case 'P2003': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = `Error de relación: no se puede procesar el registro porque depende de otra entidad inexistente o está siendo referenciado`;
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'El registro solicitado no existe o no fue encontrado';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Error de base de datos (${exception.code}): ${exception.message}`;
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'DB_VALIDATION_ERROR';
      message = 'Los datos enviados no corresponden al formato o tipos esperados por la base de datos';
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = 'SERVER_ERROR';
    }

    const correlationId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Log detail to console for the developer
    this.logger.error(
      `[${correlationId}] Error ${status} (${errorCode}) en ${request.method} ${request.url}: ${
        Array.isArray(message) ? message.join(' · ') : message
      }`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      errorCode,
      message,
      correlationId,
      meta,
      suggestion: 'Por favor, copia este mensaje y el código de error y repórtalo al programador/administrador de sistemas.',
    });
  }
}
