import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@inventory-system/backend-domain';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';

/**
 * Implementación del Unit of Work sobre Prisma + AsyncLocalStorage.
 *
 * STATELESS: no guarda `tx` en la instancia. `execute()` abre una transacción y la liga al
 * contexto asíncrono (PrismaTransactionContext); los repos inyectados la toman automáticamente.
 * Ver ADR-0001 (stateless) y ADR-0005 (unificación del acceso a datos).
 */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: PrismaTransactionContext,
  ) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    // Reentrancia: si ya estamos dentro de una transacción, reutilizarla (no anidar $transaction).
    if (this.ctx.inTransaction) {
      return work();
    }
    return this.prisma.$transaction((tx) => this.ctx.runWithTx(tx, work));
  }
}
