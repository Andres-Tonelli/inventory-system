-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RolAdministrador" AS ENUM ('SISTEMA', 'DOMINIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Administrador" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolAdministrador" NOT NULL DEFAULT 'DOMINIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdministradorDominio" (
    "id" SERIAL NOT NULL,
    "administradorId" INTEGER NOT NULL,
    "dominioId" INTEGER NOT NULL,

    CONSTRAINT "AdministradorDominio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Administrador_username_key" ON "Administrador"("username");
CREATE INDEX IF NOT EXISTS "AdministradorDominio_administradorId_idx" ON "AdministradorDominio"("administradorId");
CREATE INDEX IF NOT EXISTS "AdministradorDominio_dominioId_idx" ON "AdministradorDominio"("dominioId");
CREATE UNIQUE INDEX IF NOT EXISTS "AdministradorDominio_administradorId_dominioId_key" ON "AdministradorDominio"("administradorId", "dominioId");

-- AddForeignKey
ALTER TABLE "AdministradorDominio" DROP CONSTRAINT IF EXISTS "AdministradorDominio_administradorId_fkey";
ALTER TABLE "AdministradorDominio" ADD CONSTRAINT "AdministradorDominio_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Administrador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdministradorDominio" DROP CONSTRAINT IF EXISTS "AdministradorDominio_dominioId_fkey";
ALTER TABLE "AdministradorDominio" ADD CONSTRAINT "AdministradorDominio_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- DropIndex
DROP INDEX IF EXISTS "EstadoArticulo_codigo_key";
DROP INDEX IF EXISTS "EstadoArticulo_nombre_key";

-- AlterTable (add column if not exists)
ALTER TABLE "EstadoArticulo" ADD COLUMN IF NOT EXISTS "dominioId" INTEGER;

-- Custom Data Migration: Duplicar estados para cada dominio
INSERT INTO "EstadoArticulo" ("codigo", "nombre", "dominioId", "createdAt", "updatedAt")
SELECT DISTINCT ea."codigo", ea."nombre", d."id", NOW(), NOW()
FROM "EstadoArticulo" ea
CROSS JOIN "DominioInventario" d
WHERE ea."dominioId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "EstadoArticulo" sub 
    WHERE sub."codigo" = ea."codigo" 
      AND sub."dominioId" = d."id"
  );

-- Custom Data Migration: Reasignar estadoId en Articulo al estado específico del dominio
UPDATE "Articulo"
SET "estadoId" = new_ea."id"
FROM "Modelo" m, "Categoria" c, "EstadoArticulo" old_ea, "EstadoArticulo" new_ea
WHERE "Articulo"."modeloId" = m."id"
  AND m."categoriaId" = c."id"
  AND "Articulo"."estadoId" = old_ea."id"
  AND old_ea."codigo" = new_ea."codigo"
  AND new_ea."dominioId" = c."dominioId"
  AND old_ea."dominioId" IS NULL;

-- Custom Data Migration: Eliminar estados globales antiguos
DELETE FROM "EstadoArticulo" WHERE "dominioId" IS NULL;

-- AlterTable (make NOT NULL)
ALTER TABLE "EstadoArticulo" ALTER COLUMN "dominioId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EstadoArticulo_codigo_dominioId_key" ON "EstadoArticulo"("codigo", "dominioId");
CREATE UNIQUE INDEX IF NOT EXISTS "EstadoArticulo_nombre_dominioId_key" ON "EstadoArticulo"("nombre", "dominioId");
CREATE INDEX IF NOT EXISTS "EstadoArticulo_dominioId_idx" ON "EstadoArticulo"("dominioId");

-- AddForeignKey
ALTER TABLE "EstadoArticulo" DROP CONSTRAINT IF EXISTS "EstadoArticulo_dominioId_fkey";
ALTER TABLE "EstadoArticulo" ADD CONSTRAINT "EstadoArticulo_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "DominioInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable (AtributoDefinicion - add columns if not exists)
ALTER TABLE "AtributoDefinicion" ADD COLUMN IF NOT EXISTS "categoriaId" INTEGER;
ALTER TABLE "AtributoDefinicion" ADD COLUMN IF NOT EXISTS "nivel" TEXT NOT NULL DEFAULT 'ARTICULO';

-- Temporary map/seed category for attributes if they have dominioId but no categoriaId
-- Since Categoria belongs to DominioInventario, we map to the first category of that domain if exists
UPDATE "AtributoDefinicion" ad
SET "categoriaId" = (SELECT MIN(c.id) FROM "Categoria" c WHERE c."dominioId" = ad."dominioId")
WHERE ad."categoriaId" IS NULL AND ad."dominioId" IS NOT NULL;

-- Drop old constraints and columns
ALTER TABLE "AtributoDefinicion" DROP CONSTRAINT IF EXISTS "AtributoDefinicion_dominioId_fkey";
ALTER TABLE "AtributoDefinicion" DROP COLUMN IF EXISTS "dominioId";

-- AlterTable (AtributoDefinicion - make NOT NULL if we have matched rows)
ALTER TABLE "AtributoDefinicion" ALTER COLUMN "categoriaId" SET NOT NULL;

-- AddForeignKey (AtributoDefinicion)
ALTER TABLE "AtributoDefinicion" DROP CONSTRAINT IF EXISTS "AtributoDefinicion_categoriaId_fkey";
ALTER TABLE "AtributoDefinicion" ADD CONSTRAINT "AtributoDefinicion_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (AtributoDefinicion)
CREATE UNIQUE INDEX IF NOT EXISTS "AtributoDefinicion_clave_categoriaId_key" ON "AtributoDefinicion"("clave", "categoriaId");
CREATE UNIQUE INDEX IF NOT EXISTS "AtributoDefinicion_nombre_categoriaId_key" ON "AtributoDefinicion"("nombre", "categoriaId");
CREATE INDEX IF NOT EXISTS "AtributoDefinicion_categoriaId_idx" ON "AtributoDefinicion"("categoriaId");

-- DropIndex (AtributoDefinicion)
DROP INDEX IF EXISTS "AtributoDefinicion_clave_dominioId_key";
DROP INDEX IF EXISTS "AtributoDefinicion_dominioId_idx";

-- AlterTable (Modelo - add missing columns if not exists)
ALTER TABLE "Modelo" ADD COLUMN IF NOT EXISTS "detalle" TEXT;
ALTER TABLE "Modelo" ADD COLUMN IF NOT EXISTS "atributos" JSONB NOT NULL DEFAULT '{}';

