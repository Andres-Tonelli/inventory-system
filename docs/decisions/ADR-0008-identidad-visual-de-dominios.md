# ADR-0008 — Identidad visual configurable de dominios (icono + color)

- **Estado:** Implementado (2026-07-03)
- **Relacionado:** [ADR-0002](./ADR-0002-contrato-rest-compartido.md) (contrato como fuente única), [ADR-0006](./ADR-0006-validacion-y-dtos-en-backend.md) (validación con DTOs), [ADR-0007](./ADR-0007-workspace-del-dominio.md) (dashboard/workspace)

## Contexto

El dashboard y la config pintaban el **icono y el color** de cada dominio con una **heurística por
el nombre**: se buscaban subcadenas (`inf`/`it`→azul+🖥️, `epp`/`seg`→verde+🛡️, `lib`→ámbar+✏️) y
todo lo demás caía a un **default único** (caja indigo).

Problemas:
- Un dominio nuevo que no matchee ninguna palabra clave (ej. "Vehículos", "Juegos de Mesa") se veía
  idéntico a cualquier otro no-matcheado: no tenía identidad propia.
- La heurística es frágil: es coincidencia de texto (ej. `con` matchea muchas palabras) y acopla la
  apariencia al idioma/nombre elegido.

## Decisión

La identidad visual es **un dato del dominio, elegido por el administrador**, no algo adivinado.

1. **Persistencia:** dos columnas *nullable* en `DominioInventario`: `icono` y `color`
   (migración `dominio_icono_color`).
2. **Listas cerradas en el contrato** como fuente única de verdad:
   `DOMINIO_ICONOS` (12 íconos de PrimeIcons) y `DOMINIO_COLORES` (8 tokens de una paleta curada).
   El **front** las usa para armar el selector y el **backend** las usa para validar con `@IsIn`
   (mismo patrón contrato↔DTO de ADR-0006). No se aceptan valores arbitrarios.
3. **UI en Config › Dominios:** el diálogo de crear/editar dominio suma un **selector de icono**
   (grilla) y de **color** (swatches), con **vista previa** en vivo.
4. **Render con fallback:** dashboard, rail de config y cabecera del panel leen `dominio.icono` /
   `dominio.color`; si están vacíos, caen a `box` / `indigo`.
5. **Formato:** `icono` se guarda como sufijo de PrimeIcons (`'desktop'` → se renderiza
   `pi pi-desktop`); `color` es un token (`'blue'`) que el front mapea a las clases/vars de la paleta.

## Alternativas consideradas

- **Heurística por nombre (lo previo):** cero configuración, pero frágil, con colisiones y un único
  default para todo lo no reconocido. Rechazada: es la que motivó este ADR.
- **Hash estable nombre/id → paleta:** daría variedad automática y estable sin config, pero **no le da
  control al administrador** (no puede elegir un icono con sentido para su rubro). Descartada a pedido
  explícito (se prefirió configurable).
- **Guardar clases CSS o hex libres:** máxima flexibilidad, pero abre la puerta a inyección de clases
  y rompe la coherencia de la paleta del design system. Por eso se optó por **listas cerradas
  validadas**.

## Consecuencias

**Positivas**
- Cada dominio —incluidos los nuevos— tiene una identidad propia, estable y elegida.
- Paleta e íconos curados ⇒ coherencia visual garantizada en toda la app.
- El contrato es la única fuente: el selector del front y la validación del back comparten las mismas
  listas, no pueden desincronizarse.

**Costos**
- Los campos son opcionales: los dominios creados antes de esta feature quedan sin identidad hasta
  editarlos (se ven con el fallback caja/indigo). Se hizo *backfill* de los dominios semilla.

## Verificación

- Migración `dominio_icono_color` aplicada: columnas *nullable*, **sin pérdida de datos**.
- `nx build frontend` (strictTemplates) y backend en ejecución: **verdes**.
- API contra la app real:
  - `PUT /catalogos/dominios/:id` con `{ icono, color }` → persiste;
  - `POST` con `color` fuera de la lista → **400** (mensaje con los valores permitidos);
  - dominios sin `icono`/`color` renderizan el fallback (caja/indigo).
