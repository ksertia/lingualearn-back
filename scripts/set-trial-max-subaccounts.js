/**
 * set-trial-max-subaccounts.js
 *
 * Ponctuel : met à jour le plan TRIAL existant en base pour lui donner
 * maxSubAccounts=2 (il avait été créé avec 0 via seed-trial.js, ce qui
 * bloquait toute création de compte enfant côté addChildAccount).
 *
 * Usage : node scripts/set-trial-max-subaccounts.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.subscriptionPlan.findUnique({ where: { planCode: 'TRIAL' } });
  if (!before) {
    console.log('Aucun plan TRIAL trouvé — rien à faire.');
    return;
  }
  console.log('Avant :', { planCode: before.planCode, maxSubAccounts: before.maxSubAccounts });

  const updated = await prisma.subscriptionPlan.update({
    where: { planCode: 'TRIAL' },
    data: {
      maxSubAccounts: 2,
      features: JSON.stringify({ trial: true, maxSubAccounts: 2 }),
    },
  });
  console.log('Après  :', { planCode: updated.planCode, maxSubAccounts: updated.maxSubAccounts });
  console.log('✅ Plan TRIAL mis à jour.');
}

main()
  .catch((e) => { console.error('❌ ERREUR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
