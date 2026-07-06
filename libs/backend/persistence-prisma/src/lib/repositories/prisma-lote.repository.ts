import { Injectable } from '@nestjs/common';
import { StockLoteRepository, Criteria } from '@inventory-system/backend-domain';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { StockLote, Prisma } from '@prisma/client';

@Injectable()
export class PrismaStockLoteRepository implements StockLoteRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: StockLote): Promise<void> {
    const { modelo, entregas, ...data } = entity as any;
    if (entity.id) {
      await this.prisma.stockLote.update({ where: { id: entity.id }, data });
    } else {
      await this.prisma.stockLote.create({ data });
    }
  }

  async findById(id: number): Promise<StockLote | null> {
    return this.prisma.stockLote.findUnique({ 
      where: { id },
      include: { modelo: { include: { categoria: { include: { dominio: true } } } } }
    });
  }

  async search(criteria: Criteria): Promise<StockLote[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where['modelo'] = {
            categoria: {
              dominioId: Number(filter.value)
            }
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
    return this.prisma.stockLote.findMany({ 
      where, 
      include: { modelo: { include: { categoria: { include: { dominio: true } } } } } 
    });
  }

  async descontarStock(loteId: number, cantidad: number): Promise<boolean> {
    // UPDATE ... SET disponible = disponible - :cantidad WHERE id = :lote AND disponible >= :cantidad
    // Atómico: la condición y el descuento son una sola sentencia (no hay lost-update).
    const res = await this.prisma.stockLote.updateMany({
      where: { id: loteId, cantidadDisponible: { gte: cantidad } },
      data: { cantidadDisponible: { decrement: cantidad } },
    });
    return res.count > 0;
  }

  async agregarStock(loteId: number, cantidad: number): Promise<void> {
    await this.prisma.stockLote.update({
      where: { id: loteId },
      data: { cantidadDisponible: { increment: cantidad } },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.stockLote.delete({ where: { id } });
  }
}
