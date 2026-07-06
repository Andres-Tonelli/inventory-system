import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Articulo } from '@prisma/client';

@Injectable()
export class PrismaArticuloRepository implements Repository<Articulo> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    // Separamos relaciones y campos de control que no van directo al `data` de Prisma.
    const { modelo, asignaciones, agrupador, estado, estadoCodigo, valoresAtributos, ...rest } =
      entity;
    const data: any = { ...rest };

    // Resolver estado por CÓDIGO estable (nunca por id mágico). Ver ADR-0004 D4.
    if (estadoCodigo) {
      const e = await this.prisma.estadoArticulo.findUnique({ where: { codigo: estadoCodigo } });
      if (e) data.estadoId = e.id;
    }
    delete data.estadoCodigo;

    // Default en creación: DISPONIBLE.
    if (!data.id && data.estadoId == null) {
      const disp = await this.prisma.estadoArticulo.findUnique({ where: { codigo: 'DISPONIBLE' } });
      if (disp) data.estadoId = disp.id;
    }

    if (data.id) {
      await this.prisma.articulo.update({ where: { id: data.id }, data });
    } else {
      await this.prisma.articulo.create({ data });
    }
  }

  async findById(id: number): Promise<Articulo | null> {
    return this.prisma.articulo.findUnique({
      where: { id },
      include: {
        modelo: { include: { categoria: { include: { dominio: true } }, marca: true } },
        asignaciones: {
          where: { fechaDevolucion: null },
          include: { empleado: { include: { area: true } } },
        },
        agrupador: {
          include: {
            asignaciones: {
              where: { fechaDevolucion: null },
              include: { empleado: { include: { area: true } } },
            },
          },
        },
        estado: true,
      },
    });
  }

  async search(criteria: Criteria): Promise<Articulo[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where.modelo = { ...(where.modelo ?? {}), categoria: { ...(where.modelo?.categoria ?? {}), dominioId: Number(filter.value) } };
          continue;
        }
        if (filter.field === 'categoriaId') {
          where.modelo = { ...(where.modelo ?? {}), categoriaId: Number(filter.value) };
          continue;
        }

        if (filter.operator === 'eq') {
          if (filter.field === 'estado') {
            where['estado'] = { nombre: { equals: String(filter.value), mode: 'insensitive' } };
          } else {
            where[filter.field] = filter.value;
          }
        } else if (filter.operator === 'contains') {
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
        }
      }
    }
    return this.prisma.articulo.findMany({
      where,
      include: {
        modelo: { include: { categoria: { include: { dominio: true } }, marca: true } },
        asignaciones: {
          where: { fechaDevolucion: null },
          include: { empleado: { include: { area: true } } },
        },
        agrupador: {
          include: {
            asignaciones: {
              where: { fechaDevolucion: null },
              include: { empleado: { include: { area: true } } },
            },
          },
        },
        estado: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.articulo.delete({ where: { id } });
  }
}
