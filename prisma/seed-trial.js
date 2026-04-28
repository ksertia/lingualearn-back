const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding plan TRIAL et paramètres...');

  // Plan TRIAL
  await prisma.subscriptionPlan.upsert({
    where: { planCode: 'TRIAL' },
    update: {},
    create: {
      planCode: 'TRIAL',
      planName: 'Essai gratuit',
      description: 'Forfait d\'essai gratuit de 14 jours offert à chaque nouveau learner.',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'XOF',
      features: JSON.stringify({ trial: true, maxSubAccounts: 0 }),
      maxSubAccounts: 0,
      isActive: true,
    },
  });
  console.log('✅ Plan TRIAL créé/mis à jour');

  // Paramètre durée du trial
  await prisma.appSetting.upsert({
    where: { key: 'trial_duration_days' },
    update: {},
    create: {
      key: 'trial_duration_days',
      value: '14',
    },
  });
  console.log('✅ Paramètre trial_duration_days = 14');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
