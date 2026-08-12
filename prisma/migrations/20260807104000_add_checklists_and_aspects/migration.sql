-- CreateTable
CREATE TABLE IF NOT EXISTS "AspectoChecklist" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AspectoChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checklist" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "aspectoId" INTEGER NOT NULL,
    "articuloId" INTEGER,
    "agrupadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "pregunta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AspectoChecklist_nombre_dominioId_key" ON "AspectoChecklist"("nombre", "dominioId");
CREATE INDEX IF NOT EXISTS "AspectoChecklist_dominioId_idx" ON "AspectoChecklist"("dominioId");
CREATE INDEX IF NOT EXISTS "Checklist_aspectoId_idx" ON "Checklist"("aspectoId");
CREATE INDEX IF NOT EXISTS "Checklist_articuloId_idx" ON "Checklist"("articuloId");
CREATE INDEX IF NOT EXISTS "Checklist_agrupadorId_idx" ON "Checklist"("agrupadorId");
CREATE INDEX IF NOT EXISTS "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AspectoChecklist_dominioId_fkey') THEN
    ALTER TABLE "AspectoChecklist" ADD CONSTRAINT "AspectoChecklist_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Checklist_aspectoId_fkey') THEN
    ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_aspectoId_fkey" FOREIGN KEY ("aspectoId") REFERENCES "AspectoChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Checklist_articuloId_fkey') THEN
    ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Checklist_agrupadorId_fkey') THEN
    ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_agrupadorId_fkey" FOREIGN KEY ("agrupadorId") REFERENCES "Agrupador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChecklistItem_checklistId_fkey') THEN
    ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
