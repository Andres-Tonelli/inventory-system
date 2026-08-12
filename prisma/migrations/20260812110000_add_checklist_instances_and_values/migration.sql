-- CreateTable
CREATE TABLE "ChecklistInstancia" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "articuloId" INTEGER,
    "agrupadorId" INTEGER,
    "observaciones" TEXT,
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistValor" (
    "id" SERIAL NOT NULL,
    "instanciaId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "valor" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistValor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistInstancia_checklistId_idx" ON "ChecklistInstancia"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistInstancia_articuloId_idx" ON "ChecklistInstancia"("articuloId");

-- CreateIndex
CREATE INDEX "ChecklistInstancia_agrupadorId_idx" ON "ChecklistInstancia"("agrupadorId");

-- CreateIndex
CREATE INDEX "ChecklistValor_instanciaId_idx" ON "ChecklistValor"("instanciaId");

-- CreateIndex
CREATE INDEX "ChecklistValor_checklistItemId_idx" ON "ChecklistValor"("checklistItemId");

-- AddForeignKey
ALTER TABLE "ChecklistInstancia" ADD CONSTRAINT "ChecklistInstancia_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstancia" ADD CONSTRAINT "ChecklistInstancia_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstancia" ADD CONSTRAINT "ChecklistInstancia_agrupadorId_fkey" FOREIGN KEY ("agrupadorId") REFERENCES "Agrupador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistValor" ADD CONSTRAINT "ChecklistValor_instanciaId_fkey" FOREIGN KEY ("instanciaId") REFERENCES "ChecklistInstancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistValor" ADD CONSTRAINT "ChecklistValor_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
