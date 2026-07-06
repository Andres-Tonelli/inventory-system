# Revisión y documentación — Inventory System

Documento generado a partir de una revisión completa del código. Cubre qué hace el
sistema, cómo está armado, y una lista priorizada de problemas encontrados.

---

## 1. Qué es

Sistema de gestión de inventario para una organización: registra **artículos**
(equipamiento con número de serie), **lotes de consumibles**, **empleados/áreas**, y las
**asignaciones** de artículos/agrupadores/consumibles a empleados. Todo está segmentado por
**dominios** (contextos de inventario, ej. "Informática", "Indumentaria") y usa
**atributos dinámicos** por dominio (cada dominio define sus propios campos).

Monorepo **Nx** con dos apps:

| App | Stack | Rol |
|---|---|---|
| `apps/backend` | NestJS 11 + Prisma 5 + PostgreSQL | API REST (`/api`) |
| `apps/frontend` | Angular 21 + PrimeNG | SPA |

Arranca en `http://localhost:3000/api`. El frontend usa `proxy.conf.json` para pegarle al backend en dev.

### Modelo de dominio (Prisma)

- **DominioInventario** → agrupa Categorías, Marcas, AtributoDefinicion y TipoAgrupador.
- **Modelo** = Marca + Categoría. **Articulo** = instancia física de un Modelo, con `estado`,
  `nroSerie` opcional y valores de atributos dinámicos (`ValorAtributoArticulo`).
- **Agrupador** = conjunto jerárquico de artículos (ej. un "kit" o una "sala") que se asigna
  como unidad; tiene estado enum `DISPONIBLE|ASIGNADO`.
- **StockLote** = stock de consumibles por Modelo; se entrega con `EntregaConsumible`.
- **Empleado** (con `legajo` único) pertenece a un **Area**.
- **AsignacionArticulo / AsignacionAgrupador** = entrega a un empleado, con `fechaDevolucion` opcional.
- **EstadoArticulo** = tabla de estados (seed en `prisma/estados.csv`): 1 Disponible, 2 En uso,
  3 Para reparación, 4 Fuera de uso/Roto.

### Arquitectura del backend

Intento de **arquitectura hexagonal**: interfaces de repositorio en `domain/repositories/`,
implementaciones Prisma en `infrastructure/`, un **patrón Criteria** para queries y un
**Unit of Work** para transacciones. La idea es buena; la ejecución tiene problemas (ver abajo).

---

## 2. Hallazgos priorizados

### 🔴 CRÍTICO

#### C1 — El Unit of Work guarda la transacción en estado de instancia de un singleton
`PrismaUnitOfWork` es un provider **singleton** (única instancia para toda la app) pero
guarda la transacción activa en `this.tx`. Bajo requests concurrentes esto se corrompe:
la request B pisa el `this.tx` de la request A, y el `finally { this.tx = null }` de una
anula la transacción de la otra. Resultado posible: operaciones que se ejecutan en la
transacción equivocada, o fuera de transacción sin rollback.
📍 `infrastructure/prisma/prisma-unit-of-work.ts:12,21-29`
**Fix:** no guardar `tx` en el servicio. Pasar el cliente `tx` como argumento a cada
repositorio (o usar `AsyncLocalStorage` / un contexto por request). El UoW debe ser stateless.

> ✅ **Resuelto (2026-07-02):** `PrismaUnitOfWork` reescrito stateless (contexto por transacción).
> Ver [ADR-0001](docs/decisions/ADR-0001-arquitectura-por-capas.md) y el test de regresión
> `apps/backend/src/app/infrastructure/prisma/prisma-unit-of-work.spec.ts`.

#### C2 — No hay autenticación real y la API está completamente abierta
El "login" (`POST /api/empleados/login`) sólo comprueba que **exista un legajo** — sin
contraseña ni token. Cualquiera que conozca (o adivine) un número de legajo "entra". Además:
- El backend **no tiene ningún guard**: todos los endpoints responden sin credenciales.
- El `authGuard` del frontend sólo mira `localStorage` → se saltea trivialmente y no protege la API.

📍 `empleados.service.ts:34`, `empleados.controller.ts:39`, `frontend/core/auth/auth.guard.ts`
**Fix:** definir el modelo de seguridad. Si se necesita auth real: password + hash (argon2/bcrypt),
emitir JWT/sesión, y un `AuthGuard` en el backend aplicado globalmente. Si es una herramienta
interna sin auth, documentarlo explícitamente y protegerla a nivel de red.

### 🟠 ALTO

#### A1 — IDs de estado hardcodeados (y uno que no existe)
La lógica de asignación compara contra IDs numéricos literales:
```ts
if (articulo.estadoId === 2) // "En uso"
if (articulo.estadoId === 5) // "parte de un Agrupador"  ← el estado 5 NO existe (estados.csv sólo tiene 1..4)
articulo.estadoId = 2;        // set "En uso"
```
La rama `=== 5` es **código muerto/incorrecto**, y todo depende de que el seed genere
exactamente esos IDs. Frágil.
📍 `asignaciones.service.ts:28-37`
**Fix:** usar un enum/constantes centralizadas o resolver el estado por nombre/clave, no por ID mágico.

#### A2 — Operaciones de stock sin transacción (lost update)
`consumirLote` y `adicionarStock` hacen *leer → modificar en memoria → guardar* sin
transacción ni lock. Dos requests concurrentes sobre el mismo lote pueden pisarse y perder
unidades. Inconsistente además con `asignarConsumible`, que **sí** usa `$transaction` y
descuenta atómicamente.
📍 `inventario.service.ts:38-62` (vs `asignaciones.service.ts:129-164`)
**Fix:** actualización atómica en DB: `update ... { cantidadDisponible: { decrement: cantidad } }`
dentro de una transacción, validando stock en la misma operación.

> ✅ **Resuelto (2026-07-02):** métodos de puerto `StockLoteRepository.descontarStock`/`agregarStock`
> con `UPDATE` condicional (`WHERE disponible >= :cantidad`). Ver [ADR-0005](docs/decisions/ADR-0005-acceso-a-datos-unificado.md).
> Verificado end-to-end: consumir 3 de 10 → 7; consumir 100 → rechazado sin tocar el stock.

#### A3 — Guardar un artículo borra y recrea todos sus atributos
En `PrismaArticuloRepository.save`, el update hace `valoresAtributos: { deleteMany: {}, create: ... || [] }`.
Si un caller actualiza un artículo **sin** reenviar `valoresAtributos`, se **borran todos**.
Aun cuando se reenvían, se destruyen y recrean filas en cada cambio de estado (churn de IDs,
`updatedAt`, historial). Riesgo real de pérdida de datos según qué mande el front al editar.
📍 `inventario/infrastructure/prisma-articulo.repository.ts:31-57`
**Fix:** separar "actualizar artículo" de "actualizar atributos"; hacer upsert selectivo en vez
de deleteMany global; y nunca borrar atributos cuando el payload no los incluye.

#### A4 — Sin validación de entrada
Los controllers reciben `@Body() body: any` / `{ ... }` sin DTOs, y no hay `ValidationPipe`
global en `main.ts`. Entra cualquier payload; se castea con `as Articulo`. Propenso a datos
corruptos y errores 500 poco claros.
📍 `main.ts`, todos los `*.controller.ts`
**Fix:** DTOs con `class-validator` + `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`.

### 🟡 MEDIO

- **M1 — Dos patrones de datos mezclados.** Asignaciones y tipos-de-agrupador usan el UoW;
  inventario, empleados y catálogos usan repos **singleton** que siempre pegan al prisma global
  y **no participan de transacciones**. Elegir uno.
  📍 `inventario.service.ts`, `empleados.service.ts`, `catalogos.service.ts` vs `asignaciones.service.ts`
- **M2 — `require()` dinámico** dentro de un método en vez de `import` arriba.
  📍 `asignaciones.service.ts:93`
- **M3 — `.env` con credenciales reales versionado** (`postgres:tagsa`). Verificar `.gitignore` y rotar.
- **M4 — Prisma con `log: ['query', ...]` siempre activo** → ruidoso y filtra SQL/parametros en prod.
  📍 `prisma.service.ts:8`
- **M5 — Modelado de estado inconsistente:** `Articulo` usa tabla (`EstadoArticulo`, IDs mágicos);
  `Agrupador` usa enum. Unificar el criterio.
- **M6 — Sin flujo de devolución ni guard en DB:** `fechaDevolucion` existe pero no vi endpoint
  para devolver; y nada a nivel DB impide dos asignaciones activas del mismo artículo (la única
  defensa es el chequeo de `estadoId`, que puede fallar por C1/A1).
- **M7 — `atributosDinamicos` vs `valoresAtributos`:** el servicio/comentario habla de
  `atributosDinamicos`, pero el repo sólo procesa `valoresAtributos`; el primer campo nunca se mapea.
  📍 `inventario.service.ts:13-16`, `inventario.service.ts (front):13`
- **M8 — `main.ts` sin CORS ni versionado**, con el comentario "This is not a production server yet!".
- **M9 — Interfaz `UnitOfWork` con getters `any`** → se pierde el tipado del dominio que la
  arquitectura buscaba proteger.

### ⚪ MENOR
- **README es el genérico de Nx** — no documenta nada del proyecto (este archivo lo suple).
- Sin índices explícitos en columnas FK (Postgres no los crea solos).
- `getAsignaciones` devuelve un array heterogéneo concatenando artículos + agrupadores +
  consumibles, sin discriminador de tipo — el front tiene que adivinar la forma.
- Tests: sólo quedan los specs por defecto de Nx (backend-e2e / app.spec), sin cobertura real.

---

## 3. Sugerencia de orden para atacar

1. **C1** (UoW stateless) y **C2** (auth) — corrupción de datos y seguridad.
2. **A2/A3** (atomicidad de stock, no borrar atributos) — integridad de datos.
3. **A1/A4** (estados por constante, validación de entrada) — robustez.
4. **M1** (unificar patrón de datos) — deuda arquitectónica que amplifica el resto.
5. El resto según prioridad de producto.

## 4. Lo que está bien

- Separación por módulos y la intención hexagonal (domain/infra) es la correcta.
- El schema Prisma está bien normalizado, con uniques compuestos sensatos y atributos dinámicos por dominio.
- `asignarConsumible` es el ejemplo a seguir: valida, usa `$transaction` y descuenta de forma segura.
- El segmentado por `dominioId` está aplicado de forma consistente en las queries.
