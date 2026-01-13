// Script pour supprimer le premier admin (superadmin) de la base
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { accountType: 'admin' } });
  if (!admin) {
    console.log('Aucun admin trouvé.');
    process.exit(0);
  }
  await prisma.user.delete({ where: { id: admin.id } });
  console.log('Admin supprimé :', admin.email);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
