/*
  Warnings:

  - A unique constraint covering the columns `[nombre,tipoAgrupadorId]` on the table `Agrupador` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,dominioId]` on the table `Categoria` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,marcaId,categoriaId]` on the table `Modelo` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TipoSolicitud" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "titulo" TEXT,
ALTER COLUMN "dominioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StockLote" ADD COLUMN     "atributos" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "SubTiposEnTipoAgrupador" (
    "parentTipoId" INTEGER NOT NULL,
    "childTipoId" INTEGER NOT NULL,

    CONSTRAINT "SubTiposEnTipoAgrupador_pkey" PRIMARY KEY ("parentTipoId","childTipoId")
);

-- CreateTable
CREATE TABLE "CategoriasEnTipoAgrupador" (
    "tipoAgrupadorId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "CategoriasEnTipoAgrupador_pkey" PRIMARY KEY ("tipoAgrupadorId","categoriaId")
);

-- CreateIndex
CREATE INDEX "SubTiposEnTipoAgrupador_parentTipoId_idx" ON "SubTiposEnTipoAgrupador"("parentTipoId");

-- CreateIndex
CREATE INDEX "SubTiposEnTipoAgrupador_childTipoId_idx" ON "SubTiposEnTipoAgrupador"("childTipoId");

-- CreateIndex
CREATE INDEX "CategoriasEnTipoAgrupador_tipoAgrupadorId_idx" ON "CategoriasEnTipoAgrupador"("tipoAgrupadorId");

-- CreateIndex
CREATE INDEX "CategoriasEnTipoAgrupador_categoriaId_idx" ON "CategoriasEnTipoAgrupador"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Agrupador_nombre_tipoAgrupadorId_key" ON "Agrupador"("nombre", "tipoAgrupadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_dominioId_key" ON "Categoria"("nombre", "dominioId");

-- CreateIndex
CREATE UNIQUE INDEX "Modelo_nombre_marcaId_categoriaId_key" ON "Modelo"("nombre", "marcaId", "categoriaId");

-- AddForeignKey
ALTER TABLE "SubTiposEnTipoAgrupador" ADD CONSTRAINT "SubTiposEnTipoAgrupador_parentTipoId_fkey" FOREIGN KEY ("parentTipoId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTiposEnTipoAgrupador" ADD CONSTRAINT "SubTiposEnTipoAgrupador_childTipoId_fkey" FOREIGN KEY ("childTipoId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriasEnTipoAgrupador" ADD CONSTRAINT "CategoriasEnTipoAgrupador_tipoAgrupadorId_fkey" FOREIGN KEY ("tipoAgrupadorId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriasEnTipoAgrupador" ADD CONSTRAINT "CategoriasEnTipoAgrupador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
