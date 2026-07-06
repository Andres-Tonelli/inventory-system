import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Modelo, Prisma } from '@prisma/client';

@Injectable()
export class PrismaModeloRepository implements Repository<Modelo> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: Modelo): Promise<void> {
    if (entity.id) {
      await this.prisma.modelo.update({ where: { id: entity.id }, data: entity });
    } else {
      await this.prisma.modelo.create({ data: entity });
    }
  }

  async findById(id: number): Promise<Modelo | null> {
    return this.prisma.modelo.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<Modelo[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where['categoria'] = {
            dominioId: filter.value
          };
          continue;
        }

        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        } else if (filter.operator === 'contains') {
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
        }
      }
    }
    return this.prisma.modelo.findMany({ where, include: { marca: true, categoria: true } });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.modelo.delete({ where: { id } });
  }
}
