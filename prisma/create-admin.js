const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN = {
  email: 'admin@tibi.com',
  username: 'admin',
  password: 'Admin@1234',
  firstName: 'Admin',
  lastName: 'Tibi',
};

async function main() {
  const existing = await prisma.user.findFirst({ where: { accountType: 'admin' } });
  if (existing) {
    console.log('⚠️  Un admin existe déjà:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);

  const user = await prisma.user.create({
    data: {
      email: ADMIN.email,
      username: ADMIN.username,
      passwordHash,
      accountType: 'admin',
      isVerified: true,
      isActive: true,
      profile: { create: { firstName: ADMIN.firstName, lastName: ADMIN.lastName } },
    },
    include: { profile: true },
  });

  console.log('✅ Admin créé avec succès !');
  console.log('   Email    :', user.email);
  console.log('   Username :', user.username);
  console.log('   Password :', ADMIN.password);
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
