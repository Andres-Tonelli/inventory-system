import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Categoria, Prisma } from '@prisma/client';

@Injectable()
export class PrismaCategoriaRepository implements Repository<Categoria> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: Categoria): Promise<void> {
    if (entity.id) {
      await this.prisma.categoria.update({ where: { id: entity.id }, data: entity });
    } else {
      await this.prisma.categoria.create({ data: entity });
    }
  }

  async findById(id: number): Promise<Categoria | null> {
    return this.prisma.categoria.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<Categoria[]> {
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
    return this.prisma.categoria.findMany({ where, include: { dominio: true } });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.categoria.delete({ where: { id } });
  }
}
