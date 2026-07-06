# ADR-0001 — Arquitectura por capas con indirección de persistencia

- **Estado:** Aceptado · **implementado completo** (2026-07-02). Estructura de capas por libs
  completa; operaciones de stock atómicas resueltas (A2).

## Estructura final

```
libs/
  shared/api-contract/          contrato REST (front + back)
  backend/domain/               puertos + Criteria + EstadoCodigo
  backend/persistence-prisma/   adaptadores Prisma + PrismaModule (implementa domain)
  backend/application/          casos de uso (services; dependen de domain)
apps/
  backend/                      HTTP: controllers + DTOs + wiring de módulos
  frontend/                     UI (Angular)
```

Dependencias: `application` → `domain` ← `persistence`; `apps/backend` → application + persistence + domain.

Estas fronteras están **enforced** por `@nx/enforce-module-boundaries` (2026-07-02) con tags
`scope:*` + `type:*`: `application`→`domain`, `persistence`→`domain`, `domain`/`contract`→nada,
y front/back aislados por scope. Verificado: `nx lint` sin violaciones de frontera. Para no depender
de persistencia desde application se agregó `EstadoArticuloRepository` (última fuga que quedaba).
- **Relacionado:** [ADR-0002](./ADR-0002-contrato-rest-compartido.md)

## Contexto

El backend arrancó con una intención de arquitectura hexagonal (interfaces de repositorio en
`domain/`, implementaciones Prisma en `infrastructure/`, un patrón Criteria y un Unit of Work),
pero la ejecución mezcló responsabilidades y dejó problemas (ver [`REVISION.md`](../../REVISION.md)):

- **Dos patrones de acceso a datos conviviendo**: algunos servicios usan el Unit of Work; otros
  inyectan repositorios *singleton* que van directo al Prisma global y **no participan de
  transacciones**.
- El **Unit of Work guarda la transacción en estado de instancia** (`this.tx`) siendo un
  singleton → se corrompe entre requests concurrentes (bug crítico).
- **Lógica de dominio acoplada a detalles de persistencia**: IDs de estado hardcodeados
  (`estadoId === 2`), lectura-modificación-escritura sin transacción, etc.
- Objetivo del equipo: **alta cohesión / bajo acoplamiento** y poder **cambiar el ORM** en el
  futuro (se viene de TypeORM) sin reescribir la lógica.

## Decisión

Adoptar una **arquitectura por capas con dependencias apuntando hacia adentro** (puertos y
adaptadores), materializada como librerías Nx:

```
libs/
  shared/
    api-contract/        → contrato REST (ver ADR-0002)
  backend/
    domain/              → entidades + PUERTOS de repositorio (interfaces) + reglas de dominio
    application/         → casos de uso; dependen sólo de domain (de interfaces, no de Prisma)
    persistence-prisma/  → ADAPTADORES Prisma que implementan los puertos (indirección de persistencia)
apps/
  backend/               → NestJS: sólo HTTP (controllers) + wiring de DI
  frontend/              → Angular: sólo UI
```

Principios:

- **Bajo acoplamiento**: `application` depende de *interfaces* (`ArticuloRepository`), no de la
  implementación Prisma. El intercambio de ORM = un adaptador nuevo, sin tocar dominio ni casos de uso.
- **Alta cohesión**: cada lib tiene una responsabilidad y una única superficie pública (su barrel).
- **Indirección de persistencia**: el puerto vive en `domain`; el adaptador en `persistence-prisma`,
  enchufado por un token de DI de Nest.
- **Unit of Work stateless**: no guardar `tx` en el servicio; pasar el cliente de transacción como
  argumento a los repositorios (o usar `AsyncLocalStorage`), para eliminar el bug de concurrencia.
- **Nx `@nx/enforce-module-boundaries`** con tags (`scope:backend`, `scope:shared`, `type:domain`…)
  para que las dependencias prohibidas fallen en lint.

## Alternativas consideradas

- **Dejar todo en `apps/backend`** con carpetas por capa (sin libs) — más simple, pero no permite
  que Nx haga cumplir los límites ni que el contrato se comparta con el front.
- **Microservicios** — descartado explícitamente: el equipo quiere separación front/back, no
  distribuir el backend. Un monolito modular por capas alcanza.

## Consecuencias

**Positivas**
- Lógica de dominio testeable sin base de datos (se mockean los puertos).
- ORM reemplazable; el dominio no conoce Prisma.
- Límites explícitos y verificables por herramienta.

**Negativas / costos**
- Más ceremonia (interfaces + adaptadores + wiring de DI) y más archivos.
- Curva de aprendizaje del enfoque puertos/adaptadores.

## Plan de implementación (incremental)

1. **[hecho]** `libs/shared/api-contract` — contrato REST compartido (ADR-0002).
2. **Extraer `domain` a `libs/backend/domain` — [hecho]** (2026-07-02): puertos (Repository,
   UnitOfWork, interfaces específicas), Criteria y EstadoCodigo movidos a la lib
   `@inventory-system/backend-domain`. Build + tests verdes. (Residual: las interfaces usan tipos
   de `@prisma/client` como entidades — desacople futuro.)
3. **Extraer casos de uso a `libs/backend/application` — [hecho]** (2026-07-02): los 5 services
   movidos a `@inventory-system/backend-application`; `apps/backend` queda como capa HTTP
   (controllers + DTOs + wiring de módulos). Build + smoke test verdes.
4. **Unit of Work stateless — [hecho]** (2026-07-02): `PrismaUnitOfWork` ya no guarda `tx` en
   el singleton; cada `execute()` crea un contexto atado a su propia transacción. Resuelve el bug
   de concurrencia C1. Test de regresión en `prisma-unit-of-work.spec.ts`.
   Mover los adaptadores Prisma a `libs/backend/persistence-prisma` — **[hecho]** (2026-07-02):
   los 13 repos + PrismaService/TransactionContext/UnitOfWork/Module movidos a
   `@inventory-system/backend-persistence`. Build + tests + smoke test verdes.
5. **Unificar el acceso a datos — [hecho]** (2026-07-02, ver [ADR-0005](./ADR-0005-acceso-a-datos-unificado.md)):
   un solo patrón (repos inyectados + contexto de transacción ALS); se eliminó `getXRepository()`.
   IDs mágicos de estado ya reemplazados por códigos (ADR-0004). Operaciones de stock atómicas —
   **[hecho]** (2026-07-02): métodos de puerto `descontarStock`/`agregarStock` + repo de
   `EntregaConsumible`; se eliminaron las últimas fugas de Prisma crudo en los services. Verificado
   con test end-to-end (consumir descuenta; consumo insuficiente se rechaza sin tocar el stock).
6. **Backend consume el contrato + `ValidationPipe` — [hecho]** (2026-07-02, ver
   [ADR-0006](./ADR-0006-validacion-y-dtos-en-backend.md)): DTOs que `implements` las interfaces del
   contrato + `class-validator`, y `ValidationPipe` global.

> Se hace **vertical slice por feature** en vez de un big-bang: se rehace una feature de punta a
> punta y sirve de molde para el resto.
