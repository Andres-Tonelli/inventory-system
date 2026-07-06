import { Injectable } from '@nestjs/common';
import { EstadoArticuloRepository } from '@inventory-system/backend-domain';
import { EstadoArticulo } from '@prisma/client';
import { PrismaTransactionContext } from '../prisma-transaction-context';

@Injectable()
export class PrismaEstadoArticuloRepository implements EstadoArticuloRepository {
  constructor(private readonly ctx: PrismaTransactionContext) {}
  private get prisma(): any {
    return this.ctx.client;
  }

  async crear(nombre: string, codigo: string): Promise<void> {
    await this.prisma.estadoArticulo.create({ data: { nombre, codigo } });
  }

  async listar(): Promise<EstadoArticulo[]> {
    return this.prisma.estadoArticulo.findMany({ orderBy: { id: 'asc' } });
  }

  async actualizar(id: number, nombre: string): Promise<void> {
    await this.prisma.estadoArticulo.update({ where: { id }, data: { nombre } });
  }

  async eliminar(id: number): Promise<void> {
    await this.prisma.estadoArticulo.delete({ where: { id } });
  }
}
