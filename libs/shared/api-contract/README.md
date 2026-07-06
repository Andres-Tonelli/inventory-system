# @inventory-system/api-contract

Contrato REST **compartido** entre el frontend (Angular) y el backend (NestJS).
Es la única fuente de verdad de todo lo que cruza la red por HTTP.

## Qué contiene

- **`ApiResponse<T>` / `ApiResult<T>` / `ApiMessage`** — el envelope de las respuestas.
- **Read-models** (`Articulo`, `Agrupador`, `Empleado`, `Categoria`, ...) — la forma de lo que la API devuelve.
- **Write DTOs** (`CreateArticuloDto`, `AsignarConsumibleDto`, ...) — el body de los requests.
- **Enums** de dominio (`TipoSeguimiento`, `EstadoAgrupador`) como uniones de strings.
- **`API_ROUTES`** — las rutas de la API como constantes.

## Reglas

1. **Sin dependencias de framework ni ORM.** Nada de `@prisma/client`, `@angular/*`, `@nestjs/*`.
   Sólo tipos puros + constantes. Así lo pueden importar ambas capas sin acoplarse.
2. **Fechas como `string`** (ISO 8601): es como viajan sobre JSON/HTTP.
3. Toda respuesta nueva de la API se agrega **primero acá**, y después la implementan front y back.

## Cómo se usa

```ts
// Front (Angular)
import { ApiResponse, Categoria, API_ROUTES } from '@inventory-system/api-contract';
this.http.get<ApiResponse<Categoria[]>>(API_ROUTES.catalogos.categorias);

// Back (NestJS)
import { CreateCategoriaDto } from '@inventory-system/api-contract';
create(@Body() dto: CreateCategoriaDto) { ... }
```

El alias `@inventory-system/api-contract` está declarado en `tsconfig.base.json` →
`compilerOptions.paths`. Ese es el mecanismo que "linkea" la lib con las apps en el monorepo.
