# @inventory-system/backend-application

Capa de **aplicación** del backend (ver [ADR-0001](../../../docs/decisions/ADR-0001-arquitectura-por-capas.md)).

Contiene los **casos de uso** (los `*Service`): orquestan la lógica de negocio usando los
**puertos** de `@inventory-system/backend-domain` (interfaces de repositorio + Unit of Work) y
el contexto de persistencia. **No conocen los adaptadores Prisma concretos** (los inyectan por token).

Los controllers y los módulos de wiring viven en `apps/backend` y consumen estos services.
