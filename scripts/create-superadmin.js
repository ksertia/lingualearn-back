// Script automatique de création du premier admin (superadmin)
require('dotenv').config(); // Charger les variables d'environnement
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createUserWithDefaults } = require('../src/helpers/userCreationHelper');

const prisma = new PrismaClient();

async function main() {
  // Données préremplies pour l'admin
  const adminData = {
    email: 'wise@admin.com',
    password: 'password',
    firstName: 'Wise',
    lastName: 'Institut',
    phone: '11111111',
    username: 'wise001'
  };

  console.log('🚀 Création automatique du superadmin avec les données suivantes :');
  console.log('📧 Email:', adminData.email);
  console.log('👤 Prénom:', adminData.firstName);
  console.log('👤 Nom:', adminData.lastName);
  console.log('📱 Téléphone:', adminData.phone);
  console.log('🔑 Username:', adminData.username);
  console.log('');

  const passwordHash = await bcrypt.hash(adminData.password, 12);

  // Vérifie si un admin existe déjà
  const existingAdmin = await prisma.user.findFirst({
    where: { accountType: 'admin' }
  });
  if (existingAdmin) {
    console.log('❌ Un admin existe déjà. Opération annulée.');
    console.log('Admin existant:', existingAdmin.email);
    process.exit(0);
  }

  // Crée le user admin
  try {
    const user = await createUserWithDefaults(prisma, {
      email: adminData.email,
      phone: adminData.phone || null,
      username: adminData.username || null,
      passwordHash,
      accountType: 'admin',
      profile: {
        create: {
          firstName: adminData.firstName,
          lastName: adminData.lastName
        }
      }
    });
    
    console.log('✅ Superadmin créé avec succès !');
    console.log('📋 Détails:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Nom complet:', user.profile.firstName, user.profile.lastName);
    console.log('   Username:', user.username);
    console.log('   Account Type:', user.accountType);
    console.log('   Verified:', user.isVerified);
    console.log('   Active:', user.isActive);
    console.log('');
    console.log('🔐 Vous pouvez maintenant vous connecter avec:');
    console.log('   Email:', adminData.email);
    console.log('   Password:', adminData.password);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du superadmin:', error.message);
    throw error;
  }
}

main().catch(e => {
  console.error('❌ Erreur fatale:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
  console.log('🔌 Connexion à la base de données fermée.');
});
