# ADR-0006 — Validación y DTOs del contrato en el backend

- **Estado:** Implementado (2026-07-02)
- **Relacionado:** [ADR-0002](./ADR-0002-contrato-rest-compartido.md) (contrato), [REVISION.md](../../REVISION.md) (A4)

## Contexto

Los controllers recibían `@Body() body: any` (o tipos inline) **sin validación**: entraba
cualquier payload y se casteaba con `as`. No había `ValidationPipe`. Es la deuda A4 de la revisión
y deja el borde HTTP sin defensa.

Además queríamos que el backend **consuma el contrato compartido** (`@inventory-system/api-contract`)
para cerrar el círculo REST de punta a punta.

## Decisión

1. **`ValidationPipe` global** en `main.ts`, con `whitelist` (descarta props no declaradas),
   `forbidNonWhitelisted` (400 si mandan props de más) y `transform` (instancia el DTO y castea).
2. **Clases DTO en el backend** (una por módulo, en `*/dto/*.dto.ts`) que:
   - **`implements` la interfaz del contrato** (`class CreateArticuloDto implements ICreateArticuloDto`).
     Si el contrato cambia, el DTO **no compila** hasta actualizarlo → no se desincronizan.
   - agregan los **decoradores de `class-validator`** para la validación en runtime.
3. **El contrato sigue siendo interfaces puras** (se respeta la regla de ADR-0002: sin dependencias
   de framework/librerías). La validación vive en el backend, no en el contrato.
4. Se agregan `class-validator` y `class-transformer` como dependencias.

```ts
// contrato (interface pura, compartida con el front)
export interface CreateArticuloDto { modeloId: number; estadoCodigo?: string; ... }

// backend (clase que valida y NO puede desviarse de la interface)
export class CreateArticuloDto implements ICreateArticuloDto {
  @IsInt() modeloId!: number;
  @IsOptional() @IsString() estadoCodigo?: string;
  ...
}
```

## Alternativas consideradas

- **Poner las clases con decoradores EN el contrato**: el front (Angular) tendría que arrastrar
  `class-validator` y el contrato dejaría de ser "tipos puros". Rechazada (viola ADR-0002).
- **Validar a mano en cada service**: repetitivo y disperso; el `ValidationPipe` + DTOs es declarativo
  y centralizado.

## Consecuencias

**Positivas**
- Validación declarativa en el borde HTTP; respuestas 400 claras ante payloads inválidos.
- Sincronía contrato↔DTO garantizada por el compilador (`implements`).
- El front no se ve afectado (sigue usando las interfaces del contrato).

**Costos**
- Hay dos representaciones del mismo shape (interface en el contrato + clase en el backend), pero
  atadas por `implements` (no pueden divergir en silencio).

## Verificación

- `nx build backend` → OK (DTOs, alias del contrato y pipe compilan).
- Smoke test contra la app real:
  - body válido → **201**;
  - `nombre` vacío → **400** (MinLength);
  - prop no declarada → **400** (forbidNonWhitelisted);
  - falta un campo requerido → **400**.
