const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ADMINISTRADORES ===');
  const admins = await prisma.administrador.findMany({
    include: {
      dominios: {
        include: {
          dominio: true
        }
      }
    }
  });
  console.dir(admins, { depth: null });

  console.log('\n=== DOMINIOS ===');
  const dominios = await prisma.dominioInventario.findMany();
  console.dir(dominios, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
