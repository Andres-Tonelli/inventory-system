-- CreateEnum
CREATE TYPE "TipoSeguimiento" AS ENUM ('UNITARIO', 'POR_LOTE');

-- CreateEnum
CREATE TYPE "EstadoAgrupador" AS ENUM ('DISPONIBLE', 'ASIGNADO');

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" SERIAL NOT NULL,
    "legajo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DominioInventario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DominioInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoSeguimiento" "TipoSeguimiento" NOT NULL DEFAULT 'UNITARIO',
    "dominioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modelo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtributoDefinicion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "tipoDato" TEXT NOT NULL,
    "dominioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtributoDefinicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "nroSerie" TEXT,
    "alias" TEXT,
    "estadoId" INTEGER NOT NULL,
    "modeloId" INTEGER NOT NULL,
    "agrupadorId" INTEGER,
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAgrupador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominioId" INTEGER NOT NULL,
    "asignable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoAgrupador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agrupador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoAgrupador" NOT NULL DEFAULT 'DISPONIBLE',
    "tipoAgrupadorId" INTEGER NOT NULL,
    "agrupadorPadreId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agrupador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLote" (
    "id" SERIAL NOT NULL,
    "modeloId" INTEGER NOT NULL,
    "cantidadInicial" INTEGER NOT NULL,
    "cantidadDisponible" INTEGER NOT NULL DEFAULT 0,
    "referencia" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionArticulo" (
    "id" SERIAL NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "observaciones" TEXT,
    "articuloId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsignacionArticulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionAgrupador" (
    "id" SERIAL NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "observaciones" TEXT,
    "agrupadorId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsignacionAgrupador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaConsumible" (
    "id" SERIAL NOT NULL,
    "cantidadEntregada" INTEGER NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loteId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaConsumible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoArticulo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoArticulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_legajo_key" ON "Empleado"("legajo");

-- CreateIndex
CREATE INDEX "Empleado_areaId_idx" ON "Empleado"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "DominioInventario_nombre_key" ON "DominioInventario"("nombre");

-- CreateIndex
CREATE INDEX "Categoria_dominioId_idx" ON "Categoria"("dominioId");

-- CreateIndex
CREATE INDEX "Marca_dominioId_idx" ON "Marca"("dominioId");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nombre_dominioId_key" ON "Marca"("nombre", "dominioId");

-- CreateIndex
CREATE INDEX "Modelo_marcaId_idx" ON "Modelo"("marcaId");

-- CreateIndex
CREATE INDEX "Modelo_categoriaId_idx" ON "Modelo"("categoriaId");

-- CreateIndex
CREATE INDEX "AtributoDefinicion_dominioId_idx" ON "AtributoDefinicion"("dominioId");

-- CreateIndex
CREATE UNIQUE INDEX "AtributoDefinicion_clave_dominioId_key" ON "AtributoDefinicion"("clave", "dominioId");

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_nroSerie_key" ON "Articulo"("nroSerie");

-- CreateIndex
CREATE INDEX "Articulo_modeloId_idx" ON "Articulo"("modeloId");

-- CreateIndex
CREATE INDEX "Articulo_agrupadorId_idx" ON "Articulo"("agrupadorId");

-- CreateIndex
CREATE INDEX "Articulo_estadoId_idx" ON "Articulo"("estadoId");

-- CreateIndex
CREATE INDEX "TipoAgrupador_dominioId_idx" ON "TipoAgrupador"("dominioId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAgrupador_nombre_dominioId_key" ON "TipoAgrupador"("nombre", "dominioId");

-- CreateIndex
CREATE INDEX "Agrupador_tipoAgrupadorId_idx" ON "Agrupador"("tipoAgrupadorId");

-- CreateIndex
CREATE INDEX "Agrupador_agrupadorPadreId_idx" ON "Agrupador"("agrupadorPadreId");

-- CreateIndex
CREATE INDEX "StockLote_modeloId_idx" ON "StockLote"("modeloId");

-- CreateIndex
CREATE INDEX "AsignacionArticulo_articuloId_idx" ON "AsignacionArticulo"("articuloId");

-- CreateIndex
CREATE INDEX "AsignacionArticulo_empleadoId_idx" ON "AsignacionArticulo"("empleadoId");

-- CreateIndex
CREATE INDEX "AsignacionAgrupador_agrupadorId_idx" ON "AsignacionAgrupador"("agrupadorId");

-- CreateIndex
CREATE INDEX "AsignacionAgrupador_empleadoId_idx" ON "AsignacionAgrupador"("empleadoId");

-- CreateIndex
CREATE INDEX "EntregaConsumible_loteId_idx" ON "EntregaConsumible"("loteId");

-- CreateIndex
CREATE INDEX "EntregaConsumible_empleadoId_idx" ON "EntregaConsumible"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoArticulo_codigo_key" ON "EstadoArticulo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoArticulo_nombre_key" ON "EstadoArticulo"("nombre");

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marca" ADD CONSTRAINT "Marca_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtributoDefinicion" ADD CONSTRAINT "AtributoDefinicion_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoArticulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_agrupadorId_fkey" FOREIGN KEY ("agrupadorId") REFERENCES "Agrupador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoAgrupador" ADD CONSTRAINT "TipoAgrupador_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agrupador" ADD CONSTRAINT "Agrupador_agrupadorPadreId_fkey" FOREIGN KEY ("agrupadorPadreId") REFERENCES "Agrupador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agrupador" ADD CONSTRAINT "Agrupador_tipoAgrupadorId_fkey" FOREIGN KEY ("tipoAgrupadorId") REFERENCES "TipoAgrupador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLote" ADD CONSTRAINT "StockLote_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionArticulo" ADD CONSTRAINT "AsignacionArticulo_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionArticulo" ADD CONSTRAINT "AsignacionArticulo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAgrupador" ADD CONSTRAINT "AsignacionAgrupador_agrupadorId_fkey" FOREIGN KEY ("agrupadorId") REFERENCES "Agrupador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAgrupador" ADD CONSTRAINT "AsignacionAgrupador_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaConsumible" ADD CONSTRAINT "EntregaConsumible_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaConsumible" ADD CONSTRAINT "EntregaConsumible_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "StockLote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
