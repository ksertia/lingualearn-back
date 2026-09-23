/**
 * rollback-module-migration.js
 *
 * Annule les effets de migrate-module-to-theme.js --execute en restaurant
 * l'état d'avant à partir d'un backup JSON pris juste avant l'exécution.
 * Idempotent : peut être relancé sans risque si une exécution précédente a
 * été interrompue à mi-chemin (chaque étape est un `update`/`deleteMany`
 * réappliqué sans condition).
 *
 * Usage :
 *   node scripts/rollback-module-migration.js <chemin-vers-le-backup.json>          dry-run
 *   node scripts/rollback-module-migration.js <chemin-vers-le-backup.json> --execute exécution réelle
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');
const backupPath = process.argv[2];

if (!backupPath || !fs.existsSync(backupPath)) {
  console.error('Usage: node scripts/rollback-module-migration.js <chemin-backup.json> [--execute]');
  process.exit(1);
}

async function main() {
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`Backup chargé : ${backupPath}`);
  console.log(`  contents: ${backup.contents.length}, evaluationAttempts: ${backup.evaluationAttempts.length}`);

  const newThemes = await prisma.theme.findMany({ where: { moduleId: null } });
  const newThemeIds = newThemes.map((t) => t.id);
  const newSubThemes = newThemeIds.length > 0
    ? await prisma.subTheme.findMany({ where: { themeId: { in: newThemeIds } } })
    : [];
  const newSubThemeIds = newSubThemes.map((s) => s.id);

  console.log(`\nÀ annuler : ${newThemeIds.length} Theme, ${newSubThemeIds.length} SubTheme`);

  if (!EXECUTE) {
    console.log('\n🔎 Dry-run — aucune écriture. Relancer avec --execute pour appliquer le rollback.');
    return;
  }

  console.log('\n🚀 Rollback en cours...');

  // 1. Remettre chaque Content à son subThemeId/index d'origine.
  let restoredContents = 0;
  for (const c of backup.contents) {
    await prisma.content.update({ where: { id: c.id }, data: { subThemeId: c.subThemeId, index: c.index } });
    restoredContents++;
  }
  console.log(`✅ Content restaurés : ${restoredContents}`);

  // 2. Remettre chaque EvaluationAttempt à son evaluationId d'origine.
  let restoredAttempts = 0;
  for (const a of backup.evaluationAttempts) {
    await prisma.evaluationAttempt.update({ where: { id: a.id }, data: { evaluationId: a.evaluationId } });
    restoredAttempts++;
  }
  console.log(`✅ EvaluationAttempt restaurés : ${restoredAttempts}`);

  // 3. Supprimer les Evaluation créées par la migration (rattachées aux nouveaux SubTheme).
  const delEval = newSubThemeIds.length > 0
    ? await prisma.evaluation.deleteMany({ where: { subThemeId: { in: newSubThemeIds } } })
    : { count: 0 };
  console.log(`✅ Evaluation supprimées : ${delEval.count}`);

  // 4. Supprimer les UserSubThemeProgress créées par la migration.
  const delProg = newSubThemeIds.length > 0
    ? await prisma.userSubThemeProgress.deleteMany({ where: { subThemeId: { in: newSubThemeIds } } })
    : { count: 0 };
  console.log(`✅ UserSubThemeProgress supprimées : ${delProg.count}`);

  // 5. Supprimer les nouveaux SubTheme puis Theme.
  const delSub = newSubThemeIds.length > 0
    ? await prisma.subTheme.deleteMany({ where: { id: { in: newSubThemeIds } } })
    : { count: 0 };
  console.log(`✅ SubTheme supprimés : ${delSub.count}`);

  const delTheme = newThemeIds.length > 0
    ? await prisma.theme.deleteMany({ where: { id: { in: newThemeIds } } })
    : { count: 0 };
  console.log(`✅ Theme supprimés : ${delTheme.count}`);

  // 6. Vérification finale : les compteurs doivent revenir à l'état du backup.
  const [modules, themes, subThemes, contents] = await Promise.all([
    prisma.module.count(),
    prisma.theme.count(),
    prisma.subTheme.count(),
    prisma.content.count(),
  ]);
  console.log('\n=== État après rollback ===');
  console.log({ modules, themes, subThemes, contents });
  console.log('=== État attendu (backup) ===');
  console.log({
    modules: backup.meta.counts.modules,
    themes: backup.meta.counts.themes,
    subThemes: backup.meta.counts.subThemes,
    contents: backup.meta.counts.contents,
  });

  const ok = modules === backup.meta.counts.modules
    && themes === backup.meta.counts.themes
    && subThemes === backup.meta.counts.subThemes
    && contents === backup.meta.counts.contents;

  console.log(ok ? '\n✅ Rollback complet et cohérent avec le backup.' : '\n❌ Écart détecté — vérifier manuellement avant de relancer la migration.');
}

main()
  .catch((e) => { console.error('❌ ERREUR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
