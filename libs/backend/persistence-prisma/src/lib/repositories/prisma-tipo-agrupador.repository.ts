import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../prisma-transaction-context';
import { TipoAgrupadorRepository, Criteria } from '@inventory-system/backend-domain';
import { TipoAgrupador } from '@prisma/client';

@Injectable()
export class PrismaTipoAgrupadorRepository implements TipoAgrupadorRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async save(entity: any): Promise<void> {
    if (entity.id) {
      const { id, agrupadores, dominio, categoriasRecomendadas, categoriaIds, ...data } = entity;
      await this.prisma.$transaction(async (tx: any) => {
        await tx.tipoAgrupador.update({
          where: { id },
          data
        });
        if (categoriaIds !== undefined) {
          await tx.categoriasEnTipoAgrupador.deleteMany({
            where: { tipoAgrupadorId: id }
          });
          if (categoriaIds.length > 0) {
            await tx.categoriasEnTipoAgrupador.createMany({
              data: categoriaIds.map((catId: number) => ({
                tipoAgrupadorId: id,
                categoriaId: catId
              }))
            });
          }
        }
      });
    } else {
      const { agrupadores, dominio, categoriasRecomendadas, categoriaIds, ...data } = entity;
      await this.prisma.$transaction(async (tx: any) => {
        const created = await tx.tipoAgrupador.create({
          data
        });
        if (categoriaIds && categoriaIds.length > 0) {
          await tx.categoriasEnTipoAgrupador.createMany({
            data: categoriaIds.map((catId: number) => ({
              tipoAgrupadorId: created.id,
              categoriaId: catId
            }))
          });
        }
      });
    }
  }

  async findById(id: number): Promise<TipoAgrupador | null> {
    return this.prisma.tipoAgrupador.findUnique({
      where: { id },
      include: { categoriasRecomendadas: { include: { categoria: true } } }
    });
  }

  async search(criteria: Criteria): Promise<TipoAgrupador[]> {
    const where: any = {};
    if (criteria.hasFilters()) {
      for (const filter of criteria.filters) {
        if (filter.operator === 'eq') {
          where[filter.field] = filter.value;
        }
      }
    }
    return this.prisma.tipoAgrupador.findMany({
      where,
      include: { categoriasRecomendadas: { include: { categoria: true } } }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.tipoAgrupador.delete({ where: { id } });
  }
}
