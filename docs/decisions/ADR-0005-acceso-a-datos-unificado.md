# ADR-0005 — Acceso a datos unificado (repos + contexto de transacción ALS)

- **Estado:** Implementado (2026-07-02)
- **Relacionado:** [ADR-0001](./ADR-0001-arquitectura-por-capas.md), [REVISION.md](../../REVISION.md) (M1)

## Contexto

El backend tenía **dos patrones de acceso a datos conviviendo** (deuda M1 de la revisión):

1. **Unit of Work**: servicios que hacían `uow.execute(ctx => ctx.getXRepository())` (asignaciones,
   agrupadores, tipos de agrupador). El UoW *creaba* los repos por transacción.
2. **Repos singleton inyectados**: servicios que inyectaban `@Inject('XRepository')` y pegaban
   directo al cliente Prisma global (inventario, empleados, catálogos) — **sin participar de
   transacciones**.

Además había un `require()` dinámico dentro de un método y accesos sueltos a `this.prisma`.
Resultado: dos formas de hacer lo mismo, y atomicidad sólo en la mitad de los casos.

## Decisión

Unificar en **un solo patrón**: **repositorios siempre inyectados por token (puertos)** +
**un contexto de transacción basado en `AsyncLocalStorage` (ALS)**.

- **`PrismaTransactionContext`** (singleton) tiene un `AsyncLocalStorage`. Expone `client`, que
  devuelve el `tx` de la transacción en curso (si estamos dentro de un `execute()`) o el cliente
  base de Prisma (si no).
- **Los repositorios** ya no reciben un cliente por constructor: inyectan el contexto y usan
  `this.ctx.client` para cada query. Así un mismo repo (singleton) es transaccional o no según
  el contexto asíncrono, sin propagar el `tx` a mano.
- **`UnitOfWork.execute(work)`** abre `prisma.$transaction` y liga el `tx` al ALS
  (`ctx.runWithTx`). Es *stateless* (ADR-0001) y reentrante (si ya hay transacción, la reutiliza).
- Desaparece el `getXRepository()` del UoW: la interfaz queda en sólo `execute(work)`.
- **Toda la persistencia se centraliza** en `PrismaModule` (`@Global`): cliente, contexto de
  transacción, Unit of Work y los 13 repositorios expuestos por token.

Uso resultante (una sola forma):

```ts
// Lectura simple: inyectar el repo y usarlo.
this.dominioRepo.search(criteria);

// Operación atómica multi-paso: envolver en execute().
this.uow.execute(async () => {
  const art = await this.articuloRepo.findById(id);   // usa el tx (ALS)
  art.estadoCodigo = 'EN_USO';
  await this.articuloRepo.save(art);
  await this.asignacionRepo.save(nueva);
});
```

## Alternativas consideradas

- **Todo por el Unit of Work** (agregar 13 `getXRepository()`): obliga a envolver hasta las
  lecturas en transacciones y acopla el UoW a todos los repos. Rechazada.
- **Pasar el `tx` como argumento** a cada repo/método: explícito pero invasivo y ruidoso en cada
  llamada. El ALS lo hace transparente.

## Consecuencias

**Positivas**
- Una sola forma de acceder a datos; se elimina la duda "¿UoW o repo inyectado?".
- Las transacciones son ortogonales: cualquier operación se vuelve atómica envolviéndola en
  `execute()`, sin cambiar los repos.
- Se eliminó el `require()` dinámico y los accesos sueltos a `this.prisma` en servicios (salvo el
  caso de estados, ver abajo).
- Persistencia concentrada en un módulo → fácil de ver y de mover a `libs/backend/persistence-prisma`.

**Costos / cuidados**
- El ALS es algo "mágico": hay que garantizar **una sola instancia** de `PrismaTransactionContext`
  (lo es: provider singleton del módulo global).

**Residual (menor)**
- ~~`CatalogosService.createEstado/getEstados` usaba `PrismaService` directo~~ → **resuelto
  (2026-07-02)**: se agregó `EstadoArticuloRepository`. Con esto la capa `application` depende
  **sólo** de `domain` (condición que ahora exige `@nx/enforce-module-boundaries`).
- ~~`InventarioService.consumirLote/adicionarStock` no atómicos (A2)~~ → **resuelto (2026-07-02)**:
  las operaciones atómicas se expresan como **métodos de puerto que revelan intención**
  (`StockLoteRepository.descontarStock`/`agregarStock`), implementados con un `UPDATE` condicional
  (`WHERE disponible >= :cantidad ... decrement`). Se agregó también `EntregaConsumibleRepository`.
  Con esto los services ya **no bajan al cliente Prisma crudo**. (Criterio: enriquecer los puertos
  con intención antes que un DSL de queries genérico — ver charla en el historial del proyecto.)

## Verificación

- `nx build backend` → OK.
- `prisma-unit-of-work.spec.ts` (vitest) → 3/3 (concurrencia, cliente base, reentrancia).
- Smoke test: app arrancada, `GET /api/catalogos/dominios` (camino repo inyectado) y
  `GET /api/asignaciones` (camino UoW + ALS) → 200 contra la base seedeada.
