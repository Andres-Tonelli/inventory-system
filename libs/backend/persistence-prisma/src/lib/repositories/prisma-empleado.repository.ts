import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { Empleado } from '@prisma/client';

@Injectable()
export class PrismaEmpleadoRepository implements Repository<Empleado> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: Empleado): Promise<void> {
    const { area, asignaciones_articulos, asignaciones_agrupadores, entregas_consumibles, ...data } = entity as any;
    if (entity.id) {
      await this.prisma.empleado.update({ where: { id: entity.id }, data });
    } else {
      await this.prisma.empleado.create({ data });
    }
  }

  async findById(id: number): Promise<Empleado | null> {
    return this.prisma.empleado.findUnique({ 
      where: { id },
      include: { area: true }
    });
  }

  async search(criteria: Criteria): Promise<Empleado[]> {
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
    return this.prisma.empleado.findMany({ 
      where,
      include: { area: true }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.empleado.delete({ where: { id } });
  }
}
