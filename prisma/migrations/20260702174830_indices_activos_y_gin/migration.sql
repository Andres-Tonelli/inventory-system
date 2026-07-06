-- CreateIndex
CREATE INDEX "Articulo_atributos_idx" ON "Articulo" USING GIN ("atributos");

-- Índices únicos PARCIALES: "asignación activa única" (ver ADR-0004 D7).
-- Garantizan que un artículo/agrupador no tenga dos asignaciones abiertas a la vez.
-- Prisma no puede expresar índices parciales en schema.prisma, por eso van como SQL crudo.
-- CAVEAT: al no estar en el schema, un futuro `prisma migrate dev` podría proponer
-- eliminarlos; si eso pasa, re-crearlos con estas mismas sentencias.
CREATE UNIQUE INDEX "ux_asig_articulo_activa" ON "AsignacionArticulo" ("articuloId") WHERE "fechaDevolucion" IS NULL;
CREATE UNIQUE INDEX "ux_asig_agrupador_activa" ON "AsignacionAgrupador" ("agrupadorId") WHERE "fechaDevolucion" IS NULL;
