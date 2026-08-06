import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@inventory-system/backend-persistence';
import { CreateSolicitudDto, ResolverSolicitudDto } from './dto/solicitudes.dto';

@Injectable()
export class SolicitudesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empleadoId: number, dto: CreateSolicitudDto) {
    // Validation for ROTURA
    if (dto.tipo === 'ROTURA') {
      if (!dto.dominioId) {
        throw new BadRequestException('El dominio es requerido para reportar una rotura');
      }
      if (!dto.articuloId) {
        throw new BadRequestException('El artículo afectado es requerido para reportar una rotura');
      }

      // Check if assigned directly
      const asignacionDirecta = await this.prisma.asignacionArticulo.findFirst({
        where: {
          articuloId: dto.articuloId,
          empleadoId,
          fechaDevolucion: null
        }
      });

      // Check if assigned inside any group
      const asignacionAgrupador = await this.prisma.asignacionAgrupador.findFirst({
        where: {
          empleadoId,
          fechaDevolucion: null,
          agrupador: {
            articulos: {
              some: { id: dto.articuloId }
            }
          }
        }
      });

      if (!asignacionDirecta && !asignacionAgrupador) {
        throw new BadRequestException('El artículo no se encuentra asignado a tu nombre');
      }
    }

    // Validation for TEMPORAL
    if (dto.tipo === 'TEMPORAL') {
      if (!dto.dominioId) {
        throw new BadRequestException('El dominio es requerido para solicitar un préstamo');
      }
      if (!dto.fechaInicio || !dto.fechaFin) {
        throw new BadRequestException('Las fechas de inicio y fin son obligatorias para préstamos temporales');
      }
      if (new Date(dto.fechaInicio) > new Date(dto.fechaFin)) {
        throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
      }
    }

    // Validation for ESCASEZ
    if (dto.tipo === 'ESCASEZ') {
      if (!dto.dominioId) {
        throw new BadRequestException('El dominio es requerido para reportar escasez');
      }
    }

    // Validation for GENERAL
    if (dto.tipo === 'GENERAL') {
      if (!dto.titulo || !dto.titulo.trim()) {
        throw new BadRequestException('El concepto o título solicitado es obligatorio');
      }
    }

    return this.prisma.solicitud.create({
      data: {
        tipo: dto.tipo,
        estado: 'PENDIENTE',
        empleadoId,
        dominioId: dto.dominioId || null,
        articuloId: dto.articuloId || null,
        categoriaId: dto.categoriaId || null,
        modeloId: dto.modeloId || null,
        cantidad: dto.cantidad || 1,
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        titulo: dto.titulo || null,
        motivo: dto.motivo,
      },
      include: {
        empleado: { select: { nombre: true, legajo: true } },
        dominio: true,
        articulo: { include: { modelo: true } },
        categoria: true,
        modelo: true,
      }
    });
  }

  async findAll(user: any, filters?: { dominioId?: number; empleadoId?: number }) {
    const where: any = {};

    // 1. Role-based access control
    if (user.rol === 'COLABORADOR') {
      where.empleadoId = user.empleadoId;
    } else if (user.rol === 'DOMINIO') {
      where.dominioId = { in: user.dominios || [] };
    }

    // 2. Extra query filters
    if (filters?.dominioId) {
      // If domain admin, ensure they only filter domain they manage
      if (user.rol === 'DOMINIO' && !user.dominios.includes(Number(filters.dominioId))) {
        throw new ForbiddenException('No tienes permisos sobre este dominio');
      }
      where.dominioId = Number(filters.dominioId);
    }
    if (filters?.empleadoId) {
      if (user.rol === 'COLABORADOR' && user.empleadoId !== Number(filters.empleadoId)) {
        throw new ForbiddenException('No tienes permisos sobre el legajo de otro empleado');
      }
      where.empleadoId = Number(filters.empleadoId);
    }

    return this.prisma.solicitud.findMany({
      where,
      include: {
        empleado: { select: { nombre: true, legajo: true } },
        dominio: true,
        articulo: { include: { modelo: true } },
        categoria: true,
        modelo: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async resolver(solicitudId: number, adminUser: any, dto: ResolverSolicitudDto) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: solicitudId }
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Role-based access check
    if (adminUser.rol === 'DOMINIO' && !adminUser.dominios.includes(solicitud.dominioId as number)) {
      throw new ForbiddenException('No tienes permisos para administrar solicitudes de este dominio');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update article status if it is a ROTURA and a new status is provided
      if (solicitud.tipo === 'ROTURA' && solicitud.articuloId && dto.nuevoEstadoArticuloCodigo) {
        const estado = await tx.estadoArticulo.findUnique({
          where: {
            codigo_dominioId: {
              codigo: dto.nuevoEstadoArticuloCodigo,
              dominioId: solicitud.dominioId!
            }
          }
        });

        if (estado) {
          await tx.articulo.update({
            where: { id: solicitud.articuloId },
            data: { estadoId: estado.id }
          });

          // Terminate active assignment if any (e.g. if set to REPARACION or BAJA, it shouldn't remain assigned to the employee)
          if (dto.nuevoEstadoArticuloCodigo !== 'EN_USO') {
            await tx.asignacionArticulo.updateMany({
              where: {
                articuloId: solicitud.articuloId,
                fechaDevolucion: null
              },
              data: {
                fechaDevolucion: new Date(),
                observaciones: `Devolución automática tras aprobación del reporte de rotura (#${solicitud.id})`
              }
            });
          }
        }
      }

      return tx.solicitud.update({
        where: { id: solicitudId },
        data: {
          estado: dto.estado,
          observacionesAdmin: dto.observacionesAdmin || null,
        },
        include: {
          empleado: { select: { nombre: true, legajo: true } },
          dominio: true,
          articulo: { include: { modelo: true } },
          categoria: true,
          modelo: true,
        }
      });
    });
  }
}
