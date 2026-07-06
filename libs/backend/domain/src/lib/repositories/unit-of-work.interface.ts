/**
 * Unit of Work: ejecuta un bloque de operaciones dentro de una transacción atómica.
 * Si `work` falla, se hace rollback automático.
 *
 * Los repositorios NO se obtienen desde acá: se inyectan por DI y quedan atados a la
 * transacción en curso vía el contexto de transacción (AsyncLocalStorage). Ver ADR-0005.
 */
export interface UnitOfWork {
  execute<T>(work: () => Promise<T>): Promise<T>;
}
