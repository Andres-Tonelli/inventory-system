import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { TipoAgrupadorRepository, Criteria } from '@inventory-system/backend-domain';
import { TipoAgrupador } from '@prisma/client';

@Injectable()
export class PrismaTipoAgrupadorRepository implements TipoAgrupadorRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    if (entity.id) {
      const { id, agrupadores, dominio, ...data } = entity;
      await this.prisma.tipoAgrupador.update({
        where: { id },
        data
      });
    } else {
      const { agrupadores, dominio, ...data } = entity;
      await this.prisma.tipoAgrupador.create({
        data
      });
    }
  }

  async findById(id: number): Promise<TipoAgrupador | null> {
    return this.prisma.tipoAgrupador.findUnique({
      where: { id }
    });
  }

  async search(criteria: Criteria): Promise<TipoAgrupador[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.tipoAgrupador.findMany({
      where
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.tipoAgrupador.delete({ where: { id } });
  }
}
