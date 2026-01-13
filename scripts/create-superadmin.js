// Script interactif de création du premier admin (superadmin)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function main() {
  const email = await ask('Email: ');
  const password = await ask('Password: ');
  const firstName = await ask('First name: ');
  const lastName = await ask('Last name: ');
  const phone = await ask('Phone (optionnel): ');
  const username = await ask('Username (optionnel): ');

  const passwordHash = await bcrypt.hash(password, 12);

  // Vérifie si un admin existe déjà
  const existingAdmin = await prisma.user.findFirst({
    where: { accountType: 'admin' }
  });
  if (existingAdmin) {
    console.log('Un admin existe déjà. Opération annulée.');
    rl.close();
    process.exit(0);
  }

  // Crée le user admin
  const user = await prisma.user.create({
    data: {
      email,
      phone: phone || null,
      username: username || null,
      passwordHash,
      accountType: 'admin',
      isVerified: true,
      isActive: true,
      profile: {
        create: {
          firstName,
          lastName
        }
      }
    },
    include: { profile: true }
  });
  console.log('Superadmin créé :', user);
  rl.close();
}

main().catch(e => {
  console.error(e);
  rl.close();
  process.exit(1);
}).finally(() => prisma.$disconnect());
