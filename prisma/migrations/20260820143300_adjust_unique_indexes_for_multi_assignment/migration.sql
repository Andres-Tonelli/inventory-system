-- DropIndex
DROP INDEX IF EXISTS "ux_asig_articulo_activa";
DROP INDEX IF EXISTS "ux_asig_agrupador_activa";

-- CreateIndex
CREATE UNIQUE INDEX "ux_asig_articulo_activa" ON "AsignacionArticulo" ("articuloId", "empleadoId") WHERE "fechaDevolucion" IS NULL;
CREATE UNIQUE INDEX "ux_asig_agrupador_activa" ON "AsignacionAgrupador" ("agrupadorId", "empleadoId") WHERE "fechaDevolucion" IS NULL;
