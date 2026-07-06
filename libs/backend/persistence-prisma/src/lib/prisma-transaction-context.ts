import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaService } from './prisma.service';

/**
 * Contexto de transacción basado en AsyncLocalStorage.
 *
 * Es el corazón de la unificación del acceso a datos (ADR-0005): los repositorios NO reciben
 * un cliente por constructor ni se crean por transacción. Siempre piden `client`, que devuelve:
 *   - el cliente `tx` de la transacción en curso (si estamos dentro de un `execute()`), o
 *   - el cliente base de Prisma (si no hay transacción).
 *
 * Así un mismo repo (singleton, inyectado por DI) funciona transaccional o no según el contexto,
 * sin propagar el `tx` a mano. Reemplaza el patrón `getXRepository()` del Unit of Work anterior.
 */
@Injectable()
export class PrismaTransactionContext {
  private readonly als = new AsyncLocalStorage<{ tx: any }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Cliente activo: el `tx` de la transacción en curso, o el cliente base si no hay ninguna. */
  get client(): any {
    return this.als.getStore()?.tx ?? this.prisma;
  }

  /** ¿Hay una transacción en curso en este contexto asíncrono? */
  get inTransaction(): boolean {
    return this.als.getStore() !== undefined;
  }

  /** Corre `work` con `tx` ligado al contexto asíncrono actual. */
  runWithTx<T>(tx: any, work: () => Promise<T>): Promise<T> {
    return this.als.run({ tx }, work);
  }
}
