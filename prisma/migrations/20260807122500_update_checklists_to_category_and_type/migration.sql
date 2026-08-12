-- AlterTable
ALTER TABLE "Checklist" DROP CONSTRAINT IF EXISTS "Checklist_articuloId_fkey";
ALTER TABLE "Checklist" DROP CONSTRAINT IF EXISTS "Checklist_agrupadorId_fkey";

ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "articuloId";
ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "agrupadorId";

ALTER TABLE "Checklist" ADD COLUMN "categoriaId" INTEGER;
ALTER TABLE "Checklist" ADD COLUMN "tipoAgrupadorId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checklist_categoriaId_idx" ON "Checklist"("categoriaId");
CREATE INDEX IF NOT EXISTS "Checklist_tipoAgrupadorId_idx" ON "Checklist"("tipoAgrupadorId");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_tipoAgrupadorId_fkey" FOREIGN KEY ("tipoAgrupadorId") REFERENCES "TipoAgrupador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX IF EXISTS "Checklist_articuloId_idx";
DROP INDEX IF EXISTS "Checklist_agrupadorId_idx";
