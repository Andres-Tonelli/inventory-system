import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { DominioInventario } from '@prisma/client';

@Injectable()
export class PrismaDominioRepository implements Repository<DominioInventario> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: DominioInventario): Promise<void> {
    if (entity.id) {
      await this.prisma.dominioInventario.update({ where: { id: entity.id }, data: entity });
    } else {
      await this.prisma.dominioInventario.create({ data: entity });
    }
  }

  async findById(id: number): Promise<DominioInventario | null> {
    return this.prisma.dominioInventario.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<DominioInventario[]> {
    // Traductor de Criteria a Prisma (Specification Pattern)
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
    return this.prisma.dominioInventario.findMany({ where });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.dominioInventario.delete({ where: { id } });
  }
}
