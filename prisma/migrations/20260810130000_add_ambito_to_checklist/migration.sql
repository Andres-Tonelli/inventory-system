-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN "ambito" TEXT NOT NULL DEFAULT 'ARTICULO';

-- Update existing checklists to correct ambito based on relations
UPDATE "Checklist" SET "ambito" = 'AGRUPADOR' WHERE "tipoAgrupadorId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Checklist_ambito_idx" ON "Checklist"("ambito");
