import { describe, it, expect } from 'vitest';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaTransactionContext } from './prisma-transaction-context';

/**
 * Prisma falso: cada $transaction genera un `tx` con id único, con un pequeño delay para
 * forzar que transacciones concurrentes se intercalen.
 */
function fakePrisma() {
  let n = 0;
  return {
    __base: true,
    $transaction: async (cb: (tx: any) => Promise<any>) => {
      const tx = { __id: ++n };
      await new Promise((r) => setTimeout(r, 5));
      return cb(tx);
    },
  } as any;
}

describe('PrismaUnitOfWork + PrismaTransactionContext (stateless, ALS)', () => {
  it('cada execute() concurrente ve su propia transacción vía el contexto', async () => {
    const prisma = fakePrisma();
    const ctx = new PrismaTransactionContext(prisma);
    const uow = new PrismaUnitOfWork(prisma, ctx);

    const run = () =>
      uow.execute(async () => {
        await new Promise((r) => setTimeout(r, 5)); // fuerza intercalado
        return ctx.client.__id; // resuelve el tx de ESTA transacción (AsyncLocalStorage)
      });

    const results = await Promise.all([run(), run(), run()]);

    // 3 transacciones concurrentes => 3 tx distintos. Con un contexto compartido mutable
    // (el bug viejo) verían el mismo y el Set tendría tamaño 1.
    expect(new Set(results).size).toBe(3);
  });

  it('fuera de execute(), el contexto usa el cliente base', () => {
    const prisma = fakePrisma();
    const ctx = new PrismaTransactionContext(prisma);

    expect(ctx.inTransaction).toBe(false);
    expect(ctx.client.__base).toBe(true);
  });

  it('reentrancia: un execute() anidado reutiliza la misma transacción', async () => {
    const prisma = fakePrisma();
    const ctx = new PrismaTransactionContext(prisma);
    const uow = new PrismaUnitOfWork(prisma, ctx);

    const { outer, inner } = await uow.execute(async () => {
      const outer = ctx.client.__id;
      const inner = await uow.execute(async () => ctx.client.__id);
      return { outer, inner };
    });

    expect(inner).toBe(outer);
  });
});
