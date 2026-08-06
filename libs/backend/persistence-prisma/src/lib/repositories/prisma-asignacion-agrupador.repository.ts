import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { AsignacionAgrupadorRepository, Criteria } from '@inventory-system/backend-domain';
import { AsignacionAgrupador } from '@prisma/client';

@Injectable()
export class PrismaAsignacionAgrupadorRepository implements AsignacionAgrupadorRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    const { empleado, agrupador, ...data } = entity;
    if (data.id) {
      await this.prisma.asignacionAgrupador.update({ where: { id: data.id }, data });
    } else {
      await this.prisma.asignacionAgrupador.create({ data });
    }
  }

  async findById(id: number): Promise<AsignacionAgrupador | null> {
    return this.prisma.asignacionAgrupador.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<AsignacionAgrupador[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where['agrupador'] = {
            tipoAgrupador: {
              dominioId: filter.value
            }
          };
          continue;
        }
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.asignacionAgrupador.findMany({ 
      where, 
      include: {
        empleado: { include: { area: true } },
        agrupador: {
          include: {
            tipoAgrupador: {
              include: {
                dominio: true
              }
            }
          }
        }
      } 
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.asignacionAgrupador.delete({ where: { id } });
  }
}
