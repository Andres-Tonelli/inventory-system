# ADR-0004 — Rediseño del modelo de datos

- **Estado:** Aceptado (2026-07-02) — listo para ejecutar por fases
- **Relacionado:** [ADR-0001](./ADR-0001-arquitectura-por-capas.md), [REVISION.md](../../REVISION.md)

## Contexto

El modelo actual (ver [`prisma/schema.prisma`](../../prisma/schema.prisma)) tiene varios
puntos que generan fragilidad o no reflejan bien el dominio:

- **Atributos dinámicos con patrón EAV** (`AtributoDefinicion` + `ValorAtributoArticulo`):
  incómodo de consultar/ordenar y sin tipado real (`valor` siempre `String`).
- **Estados de artículo con IDs mágicos**: el código compara `estadoId === 2 / === 5`; funciona
  sólo porque el seed fija esos ids.
- **`"En agrupador"` (estado 5) duplica información**: la pertenencia a un conjunto ya la
  expresa `agrupadorId`. Dos fuentes de verdad que hay que mantener sincronizadas.
- **Contención y asignación mezcladas**: la jerarquía de agrupadores es "está dentro de", pero
  se la trataba como si implicara "entregado a".
- **Sin garantía de asignación activa única** a nivel base de datos.
- **`StockLote`** sin trazabilidad de lotes ni política de consumo.

## Decisiones

### D1 — Atributos por dominio: EAV → JSONB
Los valores de atributos pasan a una columna **`Articulo.atributos Json`** (JSONB), indexada.
`AtributoDefinicion` **se conserva** como catálogo/validador: define qué atributos tiene cada
dominio (clave, tipo, obligatorio, opciones, orden) y se usa para armar los formularios y
**validar en el server** lo que entra al JSON. Se elimina `ValorAtributoArticulo`.
Motiva: mejor performance de búsqueda que EAV y sin DDL dinámico; mantiene la creación de
dominios/atributos self-service en runtime. Ver ADR-0002 (mismo criterio de límites).

### D2 — Contención ≠ Asignación
La jerarquía de `Agrupador` (`agrupadorPadreId`) modela **sólo contención física/lógica**
("un conjunto dentro de otro conjunto, con artículos sueltos"). La **asignación** a un empleado
es independiente y **por unidad**:
- Asignar un agrupador entrega sus **artículos directos** a esa persona.
- Los **sub-agrupadores son unidades aparte**: no se asignan en cascada.
- El **asignatario de un artículo** se calcula subiendo por la cadena de contención hasta el
  primer agrupador asignado (o la asignación propia del artículo).

### D3 — `TipoAgrupador` configurable por el administrador
`TipoAgrupador` gana un flag **`asignable: Boolean`** que el admin define al crear el tipo.
Distingue "conjunto asignable a persona" (ej. PC, indumentaria) de "contenedor/ubicación"
(ej. locker). Un contenedor puede **contener** conjuntos asignados, pero él mismo no se entrega.
La UI muestra u oculta la acción "asignar" según este flag; el server la valida.

### D4 — Estados de artículo: tabla con `codigo` estable, sólo condición
`EstadoArticulo` sigue siendo tabla editable, pero se agrega **`codigo String @unique`**. Set
inicial **confirmado**: `DISPONIBLE`, `EN_USO`, `EN_REPARACION`, `BAJA`. El código referencia
**por `codigo`, nunca por id numérico**. El estado representa **sólo condición/disponibilidad**;
se **elimina `"En agrupador"`** (esa info la da `agrupadorId`).

### D5 — Estado del agrupador: denormalizado + único escritor
Se **mantiene** el campo `Agrupador.estado` (`DISPONIBLE`/`ASIGNADO`) por comodidad de filtrado.
Para que no se desincronice de las asignaciones reales, la invariante la garantiza un **único
punto de escritura**: el caso de uso de asignar/devolver actualiza —en la **misma transacción**—
la `AsignacionAgrupador` **y** el `estado`. Ninguna otra parte del código escribe `estado` a mano.

Terminología: un *Guard* de NestJS es para autorizar requests, **no** sirve para esto. La
sincronía se garantiza en la **capa de aplicación** (single-writer + transacción) y,
opcionalmente, se refuerza con un **trigger** de Postgres como defensa en profundidad.

### D6 — `StockLote`: lotes separados + consumo FIFO
Se mantienen **múltiples lotes por modelo**, cada uno con trazabilidad
(`cantidadInicial`, `fechaIngreso`, `referencia`). Al entregar un consumible se descuenta en
**FIFO** (lote más antiguo con stock primero), pudiendo abarcar varios lotes.
`EntregaConsumible` sigue apuntando al lote del que salió cada unidad.

> **Nota de implementación (2026-07-03).** De D6 se implementó el **registro de ingresos** (múltiples
> `StockLote` por modelo, con `cantidadInicial`/`fechaIngreso`/`referencia`), pero **NO el consumo
> FIFO**. El comportamiento vigente es **por-lote puntual**: tanto el "Consumir" del tab Consumibles
> como la entrega de consumible en Asignaciones **eligen un lote concreto** y descuentan de ese lote
> (`descontarStock(loteId, cantidad)`, atómico). No hay descuento automático del lote más antiguo ni
> que abarque varios lotes. Tras evaluar el costo (migración de `EntregaConsumible` y rework de UI),
> se decidió (acuerdo con el usuario, 2026-07-03) **mantener el consumo por-lote** por ahora; el FIFO
> queda como **intención de diseño no implementada**. Si se retoma, se hará con un ADR que lo detalle
> y, según la opción, migre `EntregaConsumible`.

### D7 — Integridad a nivel base de datos
- **Asignación activa única** (índice único parcial de Postgres):
  `UNIQUE(articuloId) WHERE fechaDevolucion IS NULL` y equivalente para agrupadores.
- **Índices** en FKs calientes (`modeloId`, `agrupadorId`, `estadoId`, `empleadoId`, `loteId`).
- **GIN** sobre `Articulo.atributos` para búsquedas dentro del JSON.

## Schema revisado (modelos afectados)

```prisma
model Articulo {
  id           Int            @id @default(autoincrement())
  nroSerie     String?        @unique
  alias        String?
  estadoId     Int
  estado       EstadoArticulo @relation(fields: [estadoId], references: [id])
  modeloId     Int
  modelo       Modelo         @relation(fields: [modeloId], references: [id])
  agrupadorId  Int?           // CONTENCIÓN: dentro de qué conjunto está
  agrupador    Agrupador?     @relation(fields: [agrupadorId], references: [id])
  atributos    Json           @default("{}")   // valores por clave: { "ram": "16" }
  asignaciones AsignacionArticulo[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([modeloId])
  @@index([agrupadorId])
  @@index([estadoId])
  @@index([atributos], type: Gin)   // si la versión de Prisma lo rechaza, se crea por SQL en la migración
}

model EstadoArticulo {
  id        Int        @id @default(autoincrement())
  codigo    String     @unique   // DISPONIBLE, EN_USO, EN_REPARACION, BAJA
  nombre    String     @unique
  articulos Articulo[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model TipoAgrupador {
  id          Int               @id @default(autoincrement())
  nombre      String
  dominioId   Int
  asignable   Boolean           @default(true)   // lo configura el admin
  dominio     DominioInventario @relation(fields: [dominioId], references: [id])
  agrupadores Agrupador[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([nombre, dominioId])
}

model Agrupador {
  id               Int                   @id @default(autoincrement())
  nombre           String
  tipoAgrupadorId  Int
  agrupadorPadreId Int?
  estado           EstadoAgrupador       @default(DISPONIBLE)   // denormalizado; lo mantiene el caso de uso (ver D5)
  tipoAgrupador    TipoAgrupador         @relation(fields: [tipoAgrupadorId], references: [id])
  agrupadorPadre   Agrupador?            @relation("AgrupadorJerarquia", fields: [agrupadorPadreId], references: [id])
  subAgrupadores   Agrupador[]           @relation("AgrupadorJerarquia")
  articulos        Articulo[]
  asignaciones     AsignacionAgrupador[]
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  @@index([tipoAgrupadorId])
  @@index([agrupadorPadreId])
}

model StockLote {
  id                 Int                 @id @default(autoincrement())
  modeloId           Int
  cantidadInicial    Int
  cantidadDisponible Int                 @default(0)
  referencia         String?             // remito / orden de compra / origen
  fechaIngreso       DateTime            @default(now())
  modelo             Modelo              @relation(fields: [modeloId], references: [id])
  entregas           EntregaConsumible[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  @@index([modeloId])
}

// Se ELIMINA: model ValorAtributoArticulo. (El enum EstadoAgrupador se CONSERVA — ver D5.)
// Índices parciales (no expresables en Prisma) → SQL crudo en la migración:
//   CREATE UNIQUE INDEX ux_asig_articulo_activa  ON "AsignacionArticulo"("articuloId")  WHERE "fechaDevolucion" IS NULL;
//   CREATE UNIQUE INDEX ux_asig_agrupador_activa ON "AsignacionAgrupador"("agrupadorId") WHERE "fechaDevolucion" IS NULL;
```

## Plan de migración (por fases, sin downtime destructivo)

1. **Agregar sin romper** (columnas nuevas con default): `Articulo.atributos`,
   `EstadoArticulo.codigo`, `TipoAgrupador.asignable`, `StockLote.{cantidadInicial,referencia,fechaIngreso}`.
   → `prisma migrate dev`.
2. **Backfill de datos** (script único):
   - `Articulo.atributos` ← agregando `ValorAtributoArticulo` por `clave`.
   - `EstadoArticulo.codigo` ← derivado del `nombre`.
   - Artículos con estado `"En agrupador"` (id 5) → se re-mapean a `EN_USO` si su agrupador
     está asignado, o `DISPONIBLE` si no. Luego se elimina ese estado.
   - `StockLote.cantidadInicial` ← `cantidadDisponible` actual; `fechaIngreso` ← `createdAt`.
   - `TipoAgrupador.asignable` ← `true` (el admin ajusta después).
3. **Migrar el código** a los campos nuevos (backend por `codigo`, atributos JSON, FIFO,
   validación de `asignable`) + actualizar el contrato (`@inventory-system/api-contract`) + el front.
4. **Limpiar**: `DROP` de `ValorAtributoArticulo` y del enum `EstadoAgrupador`/campo `estado`;
   crear índices parciales, GIN y de FKs (SQL crudo donde haga falta).

> Se hace como **vertical slice**: primero una feature (ej. Artículos + atributos) de punta a
> punta, se verifica, y recién ahí se replica al resto.

## Consecuencias

**Positivas**
- Búsquedas de atributos performantes sin DDL dinámico; tipado validado en el server.
- Un solo criterio de verdad para pertenencia (agrupadorId) y para asignación (asignaciones).
- Reglas de negocio configurables por el admin (`TipoAgrupador.asignable`) y garantizadas por la
  base (asignación activa única).
- Se van los IDs mágicos de estado.

**Negativas / costos**
- Migración multi-fase que toca base, backend, contrato y **componentes** del front.
- Derivar el estado del agrupador y el asignatario (subir por la cadena) agrega lógica de lectura.
- Validar el JSON contra `AtributoDefinicion` es responsabilidad ahora explícita del server.

## Confirmado (2026-07-02)
- Set inicial de `EstadoArticulo`: `DISPONIBLE`, `EN_USO`, `EN_REPARACION`, `BAJA`.
- `Agrupador.estado` se mantiene **denormalizado**, sincronizado por un único escritor (D5).

## Estado de ejecución (2026-07-02)
Ejecutado con `prisma migrate` (base de dev reseteada, sin backfill por acuerdo):
- Migración `rediseno_modelo_datos`: schema nuevo (JSONB, estados con `codigo`, `TipoAgrupador.asignable`,
  lotes con trazabilidad, sin `ValorAtributoArticulo`). Backend + contrato + front migrados; builds verdes.
- Migración `indices_activos_y_gin`: GIN sobre `Articulo.atributos` (D7) + los dos índices únicos
  **parciales** de "asignación activa única" (SQL crudo dentro de la migración).
  - **Caveat Prisma:** los índices parciales no se pueden expresar en `schema.prisma`, así que un
    futuro `prisma migrate dev` podría proponer eliminarlos; si pasa, re-crearlos con el SQL de la migración.

### Pendientes (no bloqueantes)
- Render de `atributos` en los diálogos de detalle (hoy quedan vacíos, sin romper).
- Índices de expresión BTREE sobre atributos "calientes" concretos (cuando se sepan cuáles).
- `prisma/estados.csv` quedó sin uso (el seed ya no lo lee).

## Revisión y Ajuste de Atributos Dinámicos (2026-07-31)

Tras evaluar el uso de los atributos dinámicos en producción local, se identificó que no todos los atributos pertenecían propiamente a la instancia física individual del artículo:

1. **Separación de Niveles en Artículos Únicos**:
   - Los atributos fijos definidos a nivel de modelo (ej. capacidad RAM, procesador, tamaño de pantalla) se movieron de `Articulo.atributos` a `Modelo.atributos`.
   - Se mantuvieron en `Articulo.atributos` únicamente los atributos específicos de la unidad física (ej. fecha de entrega de garantía, estado de desgaste específico).

2. **Atributos Dinámicos en Consumibles (Lotes)**:
   - Los consumibles se gestionan mediante lotes (`StockLote`) agrupados por su modelo. No existen registros de `Articulo` individuales para ellos.
   - Para soportar atributos personalizados sin alterar el modelo, se incorporó una columna de atributos en el lote (`StockLote.atributos Json`).
   - **Regla de asignación**:
     - Atributos con `nivel === 'MODELO'` (ej. código de cartucho, color de tinta) se guardan y editan en el `Modelo`.
     - Atributos con `nivel === 'ARTICULO'` (ej. fecha de vencimiento, nro. de remito) se ingresan en el alta de lote y se guardan en `StockLote.atributos`.

3. **Cambios en Base de Datos**:
   - Se añadió `StockLote.atributos` a `prisma/schema.prisma` y se ejecutó la sincronización.
