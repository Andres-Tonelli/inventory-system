# ADR-0002 — Contrato REST compartido (`libs/shared/api-contract`)

- **Estado:** Implementado (2026-07-02)
- **Relacionado:** [ADR-0001](./ADR-0001-arquitectura-por-capas.md)

## Contexto

El proyecto es un monorepo Nx con dos apps: `frontend` (Angular) y `backend` (NestJS).
Sin embargo, el monorepo **no compartía código**: `tsconfig.base.json` tenía
`"paths": {}` y no existía carpeta `libs/`. Consecuencia:

- El front **duplicaba a mano** todos los tipos del dominio (`Empleado` estaba definido dos
  veces con formas distintas; `Articulo`, `Categoria`, `Modelo`, etc. redefinidos en cada
  servicio Angular).
- No había una definición única de la forma de las respuestas (`{ success, data, message }`
  repetido ad hoc) ni de las rutas de la API.
- Cualquier cambio en el backend podía desincronizar el front sin que el compilador avisara.

El objetivo pedido: mantener el **límite HTTP** entre capas (como si fueran repos separados),
pero **compartir el contrato de tipos** aprovechando el monorepo — sin importar código de
implementación del back en el front.

## Decisión

Crear una librería **`@inventory-system/api-contract`** en `libs/shared/api-contract`, que es
la **única fuente de verdad** de todo lo que cruza la red:

- `ApiResponse<T>` / `ApiResult<T>` / `ApiMessage` — el envelope de las respuestas.
- **Read-models** (`Articulo`, `Agrupador`, `Empleado`, ...) — la forma de lo que la API devuelve.
- **Write DTOs** (`CreateArticuloDto`, `AsignarConsumibleDto`, ...) — el body de los requests.
- **Enums** de dominio (`TipoSeguimiento`, `EstadoAgrupador`) como uniones de string.
- **`API_ROUTES`** — las rutas de la API como constantes.

Reglas de la lib:

1. **Sin dependencias de framework ni ORM** (`@prisma/client`, `@angular/*`, `@nestjs/*`).
   Sólo tipos puros y constantes → la pueden importar ambas capas sin acoplarse.
2. **Fechas como `string`** (ISO 8601): es como viajan sobre JSON/HTTP.
3. Toda respuesta nueva se define **primero en el contrato** y después la implementan front y back.

### Cómo "linkea" el monorepo

El mecanismo es un **alias de path** en `tsconfig.base.json`:

```jsonc
"compilerOptions": {
  "baseUrl": ".",
  "paths": {
    "@inventory-system/api-contract": ["libs/shared/api-contract/src/index.ts"]
  }
}
```

Con eso, cualquier app hace `import { Articulo } from '@inventory-system/api-contract'` y
TypeScript / el bundler lo resuelven al `index.ts` (barrel) de la lib. Nx conoce la
dependencia app→lib en su grafo (`nx graph`). *(Se agregó también `baseUrl: "."`, requerido
por TypeScript para resolver `paths` con valores no relativos.)*

## Alternativas consideradas

- **Seguir duplicando tipos a mano** — rechazado: es la causa del drift actual.
- **Importar código del backend directo en el front** (posible en un monorepo) — rechazado:
  rompería el límite HTTP y acoplaría la UI a la implementación/ORM del server.
- **Generar tipos desde OpenAPI/Prisma** — buena opción a futuro, pero agrega tooling; el
  contrato escrito a mano es suficiente y explícito para el tamaño actual.

## Consecuencias

**Positivas**
- Una sola fuente de verdad; el compilador detecta desincronización front/back.
- El límite HTTP se mantiene (capas desacopladas), pero con seguridad de tipos de punta a punta.
- El front ya no define tipos de dominio; los servicios Angular consumen `ApiResponse<T>`.

**Negativas / costos**
- Hay que actualizar el contrato **antes** de tocar front o back (disciplina extra).

**Deuda asumida (a resolver en pasos siguientes)**
- Algunos read-models (`Articulo.estado`, relaciones de `Agrupador`) quedan como `any` a
  propósito: la UI hoy los usa de forma laxa y tiparlos fuerte rompería los templates
  `strictTemplates`. Se endurecerán cuando el back devuelva view-models estables.
- El **backend** todavía no consume el contrato (sus controllers usan `@Body() any`). Adoptarlo
  es parte de [ADR-0001](./ADR-0001-arquitectura-por-capas.md).
- Los servicios del front siguen hardcodeando las URLs; migrarlos a `API_ROUTES` es pendiente.

## Alcance implementado

- Lib `libs/shared/api-contract` con todos los contratos y el barrel `index.ts`.
- Alias `@inventory-system/api-contract` en `tsconfig.base.json`.
- Migrados los 6 servicios del front (`catalogos`, `inventario`, `empleados`, `asignaciones`,
  `agrupadores`, `auth`) a consumir el contrato; las interfaces duplicadas se eliminaron y se
  re-exportan desde la lib para no tocar los componentes.

## Verificación

- `tsc -p apps/frontend/tsconfig.app.json --noEmit` → OK.
- `nx build frontend` (incluye chequeo de templates con `strictTemplates`) → OK.
- `tsc -p apps/backend/tsconfig.app.json --noEmit` → OK (el cambio de `baseUrl` no lo afectó).
