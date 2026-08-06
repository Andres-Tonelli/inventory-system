import { Injectable } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { AsignacionArticulo } from '@prisma/client';
import { PrismaTransactionContext } from '../prisma-transaction-context';

@Injectable()
export class PrismaAsignacionRepository implements Repository<AsignacionArticulo> {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    const { articulo, empleado, ...data } = entity;
    if (data.id) {
      await this.prisma.asignacionArticulo.update({ where: { id: data.id }, data });
    } else {
      await this.prisma.asignacionArticulo.create({ data });
    }
  }

  async findById(id: number): Promise<AsignacionArticulo | null> {
    return this.prisma.asignacionArticulo.findUnique({ where: { id } });
  }

  async search(criteria: Criteria): Promise<AsignacionArticulo[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.field === 'dominioId') {
          where['articulo'] = {
            modelo: {
              categoria: {
                dominioId: filter.value
              }
            }
          };
          continue;
        }
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.asignacionArticulo.findMany({
      where,
      include: {
        articulo: {
          include: {
            modelo: {
              include: {
                categoria: {
                  include: {
                    dominio: true
                  }
                },
                marca: true
              }
            },
            estado: true
          }
        },
        empleado: { include: { area: true } },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.asignacionArticulo.delete({ where: { id } });
  }
}
