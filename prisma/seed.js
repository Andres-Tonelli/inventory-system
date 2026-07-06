const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  // 1. Crear Área de Administración
  const adminArea = await prisma.area.upsert({
    where: { nombre: 'Administración' },
    update: {},
    create: { nombre: 'Administración' },
  });
  
  // 2. Crear Empleado Administrador de Prueba
  await prisma.empleado.upsert({
    where: { legajo: 'admin' },
    update: {},
    create: {
      legajo: 'admin',
      nombre: 'Administrador TagSA',
      areaId: adminArea.id
    }
  });

  // 3. Crear Dominios Iniciales
  await prisma.dominioInventario.upsert({
    where: { nombre: 'Informática' },
    update: {},
    create: { nombre: 'Informática' },
  });
  
  await prisma.dominioInventario.upsert({
    where: { nombre: 'Librería' },
    update: {},
    create: { nombre: 'Librería' },
  });
  
  await prisma.dominioInventario.upsert({
    where: { nombre: 'EPP' },
    update: {},
    create: { nombre: 'EPP' },
  });

  // 4. Estados de artículo (código estable; sólo condición — ver ADR-0004 D4)
  const estados = [
    { codigo: 'DISPONIBLE', nombre: 'Disponible' },
    { codigo: 'EN_USO', nombre: 'En uso' },
    { codigo: 'EN_REPARACION', nombre: 'Para reparación' },
    { codigo: 'BAJA', nombre: 'Fuera de uso/Roto' },
  ];
  for (const e of estados) {
    await prisma.estadoArticulo.upsert({
      where: { codigo: e.codigo },
      update: { nombre: e.nombre },
      create: e,
    });
  }

  console.log("Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
