import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { AtributoDefinicion } from '@prisma/client';
import { PrismaTransactionContext } from '../prisma-transaction-context';

@Injectable()
export class PrismaAtributoRepository implements Repository<AtributoDefinicion> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: AtributoDefinicion): Promise<void> {
    const { categoria, valores, ...data } = entity as any;
    if (entity.id) {
      await this.prisma.atributoDefinicion.update({ where: { id: entity.id }, data });
    } else {
      await this.prisma.atributoDefinicion.create({ data });
    }
  }

  async findById(id: number): Promise<AtributoDefinicion | null> {
    return this.prisma.atributoDefinicion.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<AtributoDefinicion[]> {
    const where: any = {};
    criteria.filters.forEach(f => {
      if (f.operator === 'eq') where[f.field] = f.value;
      if (f.operator === 'contains') where[f.field] = { contains: f.value, mode: 'insensitive' };
    });
    return this.prisma.atributoDefinicion.findMany({ where });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.atributoDefinicion.delete({ where: { id } });
  }
}
