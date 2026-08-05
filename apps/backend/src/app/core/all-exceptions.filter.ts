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

  private getEndpointCode(method: string, url: string): string {
    const cleanPath = url.replace(/^\/api/, '').split('?')[0];
    const route = `${method}:${cleanPath}`;

    // Mapeo estático de rutas express / nest
    const mapping: { [key: string]: string } = {
      // Auth & Admins
      'POST:/auth/login': 'AUTH_001',
      'POST:/auth/logout': 'AUTH_002',
      'GET:/auth/me': 'AUTH_003',
      'GET:/auth/administradores': 'ADMIN_001',
      'POST:/auth/administradores': 'ADMIN_002',
      'PUT:/auth/administradores/:id': 'ADMIN_003',
      'DELETE:/auth/administradores/:id': 'ADMIN_004',
      'GET:/auth/dominios/:id/administradores': 'ADMIN_005',
      'POST:/auth/dominios/:id/administradores': 'ADMIN_006',
      'DELETE:/auth/dominios/:id/administradores/:adminId': 'ADMIN_007',
      
      // Catálogos
      'GET:/catalogos/dominios': 'CAT_DOM_001',
      'POST:/catalogos/dominios': 'CAT_DOM_002',
      'PUT:/catalogos/dominios/:id': 'CAT_DOM_003',
      'DELETE:/catalogos/dominios/:id': 'CAT_DOM_004',
      'GET:/catalogos/categorias': 'CAT_CAT_001',
      'POST:/catalogos/categorias': 'CAT_CAT_002',
      'PUT:/catalogos/categorias/:id': 'CAT_CAT_003',
      'DELETE:/catalogos/categorias/:id': 'CAT_CAT_004',
      'GET:/catalogos/categorias/:id/atributos': 'CAT_ATR_001',
      'POST:/catalogos/categorias/:id/atributos': 'CAT_ATR_002',
      'PUT:/catalogos/atributos/:id': 'CAT_ATR_003',
      'DELETE:/catalogos/atributos/:id': 'CAT_ATR_004',
      'GET:/catalogos/marcas': 'CAT_MAR_001',
      'POST:/catalogos/marcas': 'CAT_MAR_002',
      'PUT:/catalogos/marcas/:id': 'CAT_MAR_003',
      'DELETE:/catalogos/marcas/:id': 'CAT_MAR_004',
      'GET:/catalogos/modelos': 'CAT_MOD_001',
      'POST:/catalogos/modelos': 'CAT_MOD_002',
      'PUT:/catalogos/modelos/:id': 'CAT_MOD_003',
      'DELETE:/catalogos/modelos/:id': 'CAT_MOD_004',
      'GET:/catalogos/estados': 'CAT_EST_001',
      'POST:/catalogos/estados': 'CAT_EST_002',
      'PUT:/catalogos/estados/:id': 'CAT_EST_003',
      'DELETE:/catalogos/estados/:id': 'CAT_EST_004',

      // Inventario
      'GET:/inventario/articulos': 'INV_ART_001',
      'POST:/inventario/articulos': 'INV_ART_002',
      'PUT:/inventario/articulos/:id': 'INV_ART_003',
      'PATCH:/inventario/articulos/:id/estado': 'INV_ART_004',
      'GET:/inventario/lotes': 'INV_LOT_001',
      'POST:/inventario/lotes': 'INV_LOT_002',
      'POST:/inventario/lotes/:id/consumir': 'INV_LOT_003',
      'POST:/inventario/lotes/:id/adicionar': 'INV_LOT_004',

      // Asignaciones
      'GET:/asignaciones': 'ASG_001',
      'GET:/asignaciones/empleado/:id': 'ASG_002',
      'POST:/asignaciones/articulos': 'ASG_ART_001',
      'POST:/asignaciones/agrupadores': 'ASG_AGR_001',
      'POST:/asignaciones/consumibles': 'ASG_CON_001',
      'PATCH:/asignaciones/articulos/:id/devolver': 'ASG_ART_002',
      'PATCH:/asignaciones/agrupadores/:id/devolver': 'ASG_AGR_002',

      // Agrupadores
      'GET:/agrupadores': 'AGR_001',
      'POST:/agrupadores': 'AGR_002',
      'GET:/agrupadores/:id': 'AGR_003',
      'POST:/agrupadores/:id/articulos': 'AGR_004',
      'DELETE:/agrupadores/articulos/:articuloId': 'AGR_005',
      'POST:/agrupadores/:id/subagrupadores': 'AGR_006',
      'DELETE:/agrupadores/subagrupadores/:childAgrupadorId': 'AGR_007',

      // Empleados
      'GET:/empleados': 'EMP_001',
      'POST:/empleados': 'EMP_002',
      'PUT:/empleados/:id': 'EMP_003',
      'DELETE:/empleados/:id': 'EMP_004',
      'POST:/empleados/sincronizar-ad': 'EMP_AD_001',
      'GET:/empleados/areas': 'EMP_ARE_001',
      'POST:/empleados/areas': 'EMP_ARE_002',
      'PUT:/empleados/areas/:id': 'EMP_ARE_003',
      'DELETE:/empleados/areas/:id': 'EMP_ARE_004',
    };

    // Búsqueda directa exacta
    if (mapping[route]) return mapping[route];

    // Búsqueda reemplazando IDs con comodines :id
    const routeNormalized = route.replace(/\/\d+/g, '/:id');
    if (mapping[routeNormalized]) return mapping[routeNormalized];

    // Búsqueda por patrón de comodín personalizado (expresión regular)
    for (const pattern of Object.keys(mapping)) {
      const regexPattern = '^' + pattern
        .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')
        .replace(/\//g, '\\/') + '$';
      if (new RegExp(regexPattern).test(route)) {
        return mapping[pattern];
      }
    }

    return 'API_GEN';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocurrió un error interno en el servidor';
    let baseErrorCode = 'INTERNAL_ERROR';
    let meta: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();
      message = typeof resContent === 'string' ? resContent : resContent.message || exception.message;
      baseErrorCode = 'HTTP_EXCEPTION';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar códigos conocidos de Prisma
      baseErrorCode = `DB_PRISMA_${exception.code}`;
      meta = exception.meta;
      
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.BAD_REQUEST;
          const target = (exception.meta?.target as string[])?.join(', ') || 'campos';
          message = `Ya existe un registro con el mismo valor en los campos únicos (${target})`;
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = `Error de relación: no se puede procesar el registro porque depende de otra entidad inexistente o está siendo referenciado`;
          break;
        case 'P2025':
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
      baseErrorCode = 'DB_VALIDATION_ERROR';
      message = 'Los datos enviados no corresponden al formato o tipos esperados por la base de datos';
    } else if (exception instanceof Error) {
      message = exception.message;
      baseErrorCode = 'SERVER_ERROR';
    }

    // Obtener el código de endpoint y combinarlo con el código de error base
    const endpointCode = this.getEndpointCode(request.method, request.url);
    const errorCode = `${baseErrorCode}_${endpointCode}`;

    const correlationId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Log detallado en la consola del backend para el desarrollador
    this.logger.error(
      `[${correlationId}] Error ${status} (${errorCode}) en ${request.method} ${request.url}: ${
        Array.isArray(message) ? message.join(' · ') : message
      }`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      errorCode,
      message,
      correlationId,
      meta,
      suggestion: 'Por favor, copia este mensaje y el código de error y repórtalo al programador/administrador de sistemas.',
    });
  }
}
