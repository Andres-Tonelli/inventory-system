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

  // 4. Estados de artículo requeridos por el sistema para cada dominio
  const domains = await prisma.dominioInventario.findMany();
  for (const d of domains) {
    const estadosBase = [
      { codigo: 'DISPONIBLE', nombre: 'Disponible' },
      { codigo: 'EN_USO', nombre: 'En uso' },
    ];
    for (const e of estadosBase) {
      await prisma.estadoArticulo.upsert({
        where: {
          codigo_dominioId: {
            codigo: e.codigo,
            dominioId: d.id,
          },
        },
        update: { nombre: e.nombre },
        create: {
          codigo: e.codigo,
          nombre: e.nombre,
          dominioId: d.id,
        },
      });
    }
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
