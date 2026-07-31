import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { AgrupadorRepository, Criteria } from '@inventory-system/backend-domain';
import { Agrupador } from '@prisma/client';

@Injectable()
export class PrismaAgrupadorRepository implements AgrupadorRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    // Descarta relaciones (objetos anidados) y timestamps gestionados por Prisma:
    // el entity puede venir hidratado por findById/search con includes, y Prisma
    // rechaza un objeto de relación (ej. `agrupadorPadre`) mezclado con el FK escalar.
    if (entity.id) {
      const {
        id, createdAt, updatedAt,
        articulos, subAgrupadores, tipoAgrupador, asignaciones, agrupadorPadre,
        ...data
      } = entity;
      await this.prisma.agrupador.update({
        where: { id },
        data
      });
    } else {
      const {
        id, createdAt, updatedAt,
        articulos, subAgrupadores, tipoAgrupador, asignaciones, agrupadorPadre,
        ...data
      } = entity;
      await this.prisma.agrupador.create({
        data
      });
    }
  }

  async findById(id: number): Promise<Agrupador | null> {
    return this.prisma.agrupador.findUnique({
      where: { id },
      include: {
        tipoAgrupador: {
          include: {
            categoriasRecomendadas: { include: { categoria: true } }
          }
        },
        agrupadorPadre: {
          include: {
            tipoAgrupador: {
              include: {
                categoriasRecomendadas: { include: { categoria: true } }
              }
            }
          }
        },
        subAgrupadores: {
          include: {
            tipoAgrupador: {
              include: {
                categoriasRecomendadas: { include: { categoria: true } }
              }
            }
          }
        },
        articulos: {
          include: {
            modelo: { include: { categoria: true, marca: true } },
            estado: true
          }
        },
        asignaciones: {
          where: { fechaDevolucion: null },
          include: { empleado: { include: { area: true } } }
        }
      }
    });
  }

  async search(criteria: Criteria): Promise<Agrupador[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where.tipoAgrupador = { dominioId: filter.value };
        } else if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.agrupador.findMany({
      where,
      include: {
        articulos: {
          include: {
            modelo: { include: { categoria: { include: { dominio: true } }, marca: true } },
            asignaciones: {
              where: { fechaDevolucion: null },
              include: { empleado: { include: { area: true } } }
            },
            estado: true
          }
        },
        subAgrupadores: true,
        tipoAgrupador: {
          include: {
            categoriasRecomendadas: { include: { categoria: true } }
          }
        },
        asignaciones: {
          where: { fechaDevolucion: null },
          include: { empleado: { include: { area: true } } }
        }
      }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.agrupador.delete({ where: { id } });
  }
}
