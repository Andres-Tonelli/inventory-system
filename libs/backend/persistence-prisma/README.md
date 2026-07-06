# @inventory-system/backend-persistence

Capa de **persistencia** del backend (ver [ADR-0001](../../../docs/decisions/ADR-0001-arquitectura-por-capas.md)
y [ADR-0005](../../../docs/decisions/ADR-0005-acceso-a-datos-unificado.md)).

Adaptadores Prisma que **implementan los puertos** de `@inventory-system/backend-domain`:

- `PrismaService` — cliente Prisma (Nest).
- `PrismaTransactionContext` — contexto de transacción (AsyncLocalStorage).
- `PrismaUnitOfWork` — Unit of Work sobre `$transaction` + ALS.
- `repositories/` — los 13 adaptadores de repositorio.
- `PrismaModule` — módulo global que provee todo por token (`'ArticuloRepository'`, `'UnitOfWork'`, …).

La capa `application` (services) y los controllers (en `apps/backend`) sólo dependen de las
interfaces (`backend-domain`) y del `PrismaModule`; nunca de un repo concreto.
