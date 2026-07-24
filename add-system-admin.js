const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const username = args[0];

  if (!username) {
    console.error('Error: Debes proporcionar un nombre de usuario de red.');
    console.error('Uso: node add-system-admin.js <username> ["Nombre Opcional"]');
    process.exit(1);
  }

  const nombre = args[1] || `Admin ${username}`;

  console.log(`Buscando o creando administrador de sistema para el usuario de red: "${username}"...`);

  const admin = await prisma.administrador.upsert({
    where: { username },
    update: {
      rol: 'SISTEMA',
      nombre: nombre
    },
    create: {
      username,
      nombre,
      rol: 'SISTEMA'
    }
  });

  console.log('\n¡Éxito! Administrador configurado en base de datos:');
  console.log(`- ID: ${admin.id}`);
  console.log(`- Usuario de Red: ${admin.username}`);
  console.log(`- Nombre: ${admin.nombre}`);
  console.log(`- Rol: ${admin.rol} (Administrador de Sistema)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
