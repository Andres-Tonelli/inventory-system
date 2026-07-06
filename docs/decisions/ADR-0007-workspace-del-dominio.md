# ADR-0007 — Workspace del dominio: navegación por dominio, pantallas dinámicas de agrupadores y master-detail

- **Estado:** Implementado (2026-07-03)
- **Relacionado:** [ADR-0004](./ADR-0004-modelo-de-datos.md) (atributos JSONB, `TipoAgrupador.asignable`, contención≠asignación), [ADR-0002](./ADR-0002-contrato-rest-compartido.md) (contrato)

## Contexto

El núcleo operativo del sistema es la pantalla de un **dominio** (`/dominios/:id`). Ahí conviven cosas
de naturaleza muy distinta:

- **Artículos** con **atributos definidos por el dominio** (JSONB, ver ADR-0004 D1): las columnas
  relevantes de un dominio "Informática" (RAM, CPU) no son las de "Indumentaria" (talle, color).
- **Agrupadores** cuyo *tipo* y *nombre* los define el administrador por dominio (locker, PC, kit…),
  y que pueden ser **asignables o meros contenedores** (ADR-0004 D3).
- **Catálogo** de categorías / marcas / modelos: misma estructura en todos los dominios, pero
  contenido filtrado por dominio.
- **Consumibles** (lotes de stock).

La versión anterior era **un único `<p-tabs>` con ~8 pestañas planas** (artículos, lotes, una por cada
tipo de agrupador, categorías, marcas, modelos, y "Tipos de Agrupador"). Problemas: mezclaba
**operación** con **configuración**; las tablas de agrupadores mostraban todo inline (chips de
artículos y sub-agrupadores dentro de la fila), lo que no escala; y no había jerarquía visual entre
"lo que hago todos los días" y "lo que configuro una vez".

## Decisión

1. **Navegación de dos niveles.**
   - **Nivel 1 (qué hago):** `Operar` | `Catálogo del dominio`.
   - **Nivel 2 (con qué):**
     - Operar → `Artículos`, `Consumibles`, y **una pestaña por cada `TipoAgrupador`** del dominio,
       nombrada según su configuración (`{{tipo.nombre}}s` — ej. "Lockers", "PCs").
     - Catálogo → `Categorías`, `Marcas`, `Modelos`.
   - Separa **operación** (Operar) de **datos maestros** (Catálogo), sin sacar el catálogo del dominio.

2. **Las pantallas de agrupadores se generan dinámicamente** a partir de los `TipoAgrupador`
   configurados (no hay pantallas hardcodeadas por tipo). El nombre, la cantidad y el flag
   `asignable` salen de la configuración del dominio (ADR-0004). Un dominio nuevo con un tipo nuevo
   obtiene su pantalla sin tocar código.

3. **Agrupadores como master-detail** (tabla a la izquierda, panel de detalle a la derecha), en lugar
   de tarjetas o de la tabla con todo inline. La tabla lista los agrupadores del tipo (nombre, estado,
   asignatario, nº de artículos); al seleccionar uno, el panel muestra sus artículos y sub-agrupadores
   como chips con acciones (vincular / desvincular / abrir ficha).

4. **Columnas de atributos dinámicas** en la tabla de artículos: se renderiza una columna por cada
   `AtributoDefinicion` del dominio y el valor se lee del JSONB (`atributos[clave]`). El alta de
   artículo usa un **formulario dinámico** con un control por atributo. Consistente con ADR-0004:
   el catálogo de atributos es el que manda, la UI se adapta.

5. **Configuración fuera del workspace operativo.** La gestión de **Tipos de Agrupador** y **Atributos**
   se saca de esta pantalla y vive en *Config › Dominios*. El workspace del dominio queda para operar,
   no para configurar el dominio.

## Alternativas consideradas

- **Presentación de agrupadores — tarjetas (Opción A):** vistosas pero pobres para escanear muchos
  agrupadores y comparar estado/asignatario; el detalle no tiene lugar natural.
- **Presentación de agrupadores — lista con acordeón (Opción C):** el expandir/colapsar esconde el
  detalle y complica ver dos agrupadores a la vez. Se descartó.
- **Master-detail (Opción B) — elegida:** la tabla da densidad y comparabilidad; el panel da foco al
  detalle sin perder la lista. (El usuario ya la tenía en mente; se validó con mockups de las tres.)
- **Mantener una sola tira de pestañas planas:** rechazada; no distingue operar de configurar y crece
  sin control con cada tipo de agrupador.
- **Pantallas de agrupador hardcodeadas por tipo:** rompe la premisa de dominios dinámicos (ADR-0004);
  cada tipo nuevo exigiría código.

## Consecuencias

**Positivas**
- La IA refleja el modelo de datos: dominios dinámicos → pantallas dinámicas; atributos → columnas.
- Escala a más tipos de agrupador y más atributos sin tocar el componente.
- Separar operación de configuración baja la carga cognitiva del uso diario.
- El master-detail escala a muchos agrupadores manteniendo el detalle accionable.

**Costos**
- El componente `InventarioComponent` concentra bastante estado de navegación
  (`activeMainTab` / `activeSubTab` / `activeCatTab` / `selectedAgrupadorId`). Aceptable para una
  pantalla-workspace; si crece, se puede partir en sub-componentes por pestaña.
- Los filtros de agrupador quedaron como infraestructura en el componente sin UI que los dispare
  (uso futuro).

## Verificación

- `nx build frontend --configuration=development` → **OK** con `strictTemplates` (plantilla y tipos
  del contrato compilan; las columnas dinámicas y el master-detail tipan contra `Articulo`/`Agrupador`).
- Código muerto de la versión anterior (diálogo/estado de "Tipos de Agrupador", helpers de nav
  huérfanos, módulos PrimeNG sin uso) eliminado; build sigue verde.
- Pendiente: prueba en runtime contra la base de datos de desarrollo.
