import { Injectable } from '@nestjs/common';
import {
  Criteria,
  CrearEntregaConsumible,
  EntregaConsumibleRepository,
} from '@inventory-system/backend-domain';
import { EntregaConsumible } from '@prisma/client';
import { PrismaTransactionContext } from '../prisma-transaction-context';

@Injectable()
export class PrismaEntregaConsumibleRepository implements EntregaConsumibleRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async crear(data: CrearEntregaConsumible): Promise<EntregaConsumible> {
    return this.prisma.entregaConsumible.create({
      data: {
        loteId: data.loteId,
        empleadoId: data.empleadoId,
        cantidadEntregada: data.cantidadEntregada,
        fechaEntrega: new Date(),
      },
    });
  }

  async search(criteria: Criteria): Promise<EntregaConsumible[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where['lote'] = { modelo: { categoria: { dominioId: Number(filter.value) } } };
          continue;
        }
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.entregaConsumible.findMany({
      where,
      include: {
        empleado: { include: { area: true } },
        lote: { include: { modelo: { include: { categoria: true } } } },
      },
    });
  }
}
