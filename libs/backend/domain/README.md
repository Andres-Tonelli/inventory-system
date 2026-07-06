# @inventory-system/backend-domain

Capa de **dominio** del backend (ver [ADR-0001](../../../docs/decisions/ADR-0001-arquitectura-por-capas.md)).

Contiene los **puertos** y contratos que el resto del backend implementa/consume:

- `Repository<T>` y las interfaces de repositorio específicas (puertos).
- `UnitOfWork` (interfaz).
- El patrón `Criteria` (traducción de filtros agnóstica del ORM).
- `EstadoCodigo` (constantes de dominio).

**No depende de NestJS ni de la implementación Prisma.** La capa `persistence-prisma` implementa
estos puertos; la capa `application` los consume.

> Acoplamiento heredado: las interfaces usan tipos de `@prisma/client` como entidades.
> Desacoplarlo (entidades de dominio propias) queda como trabajo futuro.
