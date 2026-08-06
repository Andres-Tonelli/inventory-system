/*
  Warnings:

  - A unique constraint covering the columns `[nombre,tipoAgrupadorId]` on the table `Agrupador` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,dominioId]` on the table `Categoria` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,marcaId,categoriaId]` on the table `Modelo` will be added. If there are existing duplicate values, this will fail.

*/

-- AlterEnum
ALTER TYPE "TipoSolicitud" ADD VALUE 'GENERAL';

-- AlterTable (Agregar columna condicionalmente)
ALTER TABLE "Solicitud" ADD COLUMN IF NOT EXISTS "titulo" TEXT;
ALTER TABLE "Solicitud" ALTER COLUMN "dominioId" DROP NOT NULL;

-- AlterTable (Agregar atributos condicionalmente)
ALTER TABLE "StockLote" ADD COLUMN IF NOT EXISTS "atributos" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE IF NOT EXISTS "SubTiposEnTipoAgrupador" (
    "parentTipoId" INTEGER NOT NULL,
    "childTipoId" INTEGER NOT NULL,

    CONSTRAINT "SubTiposEnTipoAgrupador_pkey" PRIMARY KEY ("parentTipoId","childTipoId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CategoriasEnTipoAgrupador" (
    "tipoAgrupadorId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "CategoriasEnTipoAgrupador_pkey" PRIMARY KEY ("tipoAgrupadorId","categoriaId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubTiposEnTipoAgrupador_parentTipoId_idx" ON "SubTiposEnTipoAgrupador"("parentTipoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubTiposEnTipoAgrupador_childTipoId_idx" ON "SubTiposEnTipoAgrupador"("childTipoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CategoriasEnTipoAgrupador_tipoAgrupadorId_idx" ON "CategoriasEnTipoAgrupador"("tipoAgrupadorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CategoriasEnTipoAgrupador_categoriaId_idx" ON "CategoriasEnTipoAgrupador"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Agrupador_nombre_tipoAgrupadorId_key" ON "Agrupador"("nombre", "tipoAgrupadorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Categoria_nombre_dominioId_key" ON "Categoria"("nombre", "dominioId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Modelo_nombre_marcaId_categoriaId_key" ON "Modelo"("nombre", "marcaId", "categoriaId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubTiposEnTipoAgrupador_parentTipoId_fkey') THEN
    ALTER TABLE "SubTiposEnTipoAgrupador" ADD CONSTRAINT "SubTiposEnTipoAgrupador_parentTipoId_fkey" FOREIGN KEY ("parentTipoId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubTiposEnTipoAgrupador_childTipoId_fkey') THEN
    ALTER TABLE "SubTiposEnTipoAgrupador" ADD CONSTRAINT "SubTiposEnTipoAgrupador_childTipoId_fkey" FOREIGN KEY ("childTipoId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CategoriasEnTipoAgrupador_tipoAgrupadorId_fkey') THEN
    ALTER TABLE "CategoriasEnTipoAgrupador" ADD CONSTRAINT "CategoriasEnTipoAgrupador_tipoAgrupadorId_fkey" FOREIGN KEY ("tipoAgrupadorId") REFERENCES "TipoAgrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CategoriasEnTipoAgrupador_categoriaId_fkey') THEN
    ALTER TABLE "CategoriasEnTipoAgrupador" ADD CONSTRAINT "CategoriasEnTipoAgrupador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
