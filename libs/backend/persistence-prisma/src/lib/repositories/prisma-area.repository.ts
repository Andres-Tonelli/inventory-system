import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Area } from '@prisma/client';

@Injectable()
export class PrismaAreaRepository implements Repository<Area> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: Area): Promise<void> {
    const { empleados, ...data } = entity as any;
    if (entity.id) {
      await this.prisma.area.update({ where: { id: entity.id }, data });
    } else {
      await this.prisma.area.create({ data });
    }
  }

  async findById(id: number): Promise<Area | null> {
    return this.prisma.area.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<Area[]> {
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
    return this.prisma.area.findMany({ where });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.area.delete({ where: { id } });
  }
}
