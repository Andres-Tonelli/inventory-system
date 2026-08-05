import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Marca, Prisma } from '@prisma/client';

@Injectable()
export class PrismaMarcaRepository implements Repository<Marca> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: Marca): Promise<void> {
    const { modelos, ...data } = entity as any;
    if (entity.id) {
      await this.prisma.marca.update({ where: { id: entity.id }, data });
    } else {
      await this.prisma.marca.create({ data });
    }
  }

  async findById(id: number): Promise<Marca | null> {
    return this.prisma.marca.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<Marca[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        } else if (filter.operator === 'contains') {
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
        }
      }
    }
    return this.prisma.marca.findMany({ where });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.marca.delete({ where: { id } });
  }
}
