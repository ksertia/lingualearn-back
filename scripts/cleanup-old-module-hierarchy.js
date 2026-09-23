/**
 * cleanup-old-module-hierarchy.js
 *
 * À lancer UNIQUEMENT après migrate-module-to-theme.js --execute puis --verify,
 * et après validation manuelle explicite du rapport de vérification par l'utilisateur.
 *
 * Supprime les anciennes lignes devenues orphelines (Content/Evaluation déjà
 * déplacés vers les nouveaux Theme/SubTheme) : les anciens SubTheme, les
 * anciens Theme (ceux avec moduleId non-null) et les Module eux-mêmes.
 *
 * Usage :
 *   node scripts/cleanup-old-module-hierarchy.js             dry-run (défaut)
 *   node scripts/cleanup-old-module-hierarchy.js --execute    suppression réelle
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function tsNow() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const oldThemes = await prisma.theme.findMany({ where: { moduleId: { not: null } } });
  const oldThemeIds = oldThemes.map((t) => t.id);

  const oldSubThemes = oldThemeIds.length > 0
    ? await prisma.subTheme.findMany({ where: { themeId: { in: oldThemeIds } } })
    : [];
  const oldSubThemeIds = oldSubThemes.map((s) => s.id);

  const modules = await prisma.module.findMany();
  const moduleIds = modules.map((m) => m.id);

  console.log('=== PLAN DE NETTOYAGE ===');
  console.log(`Anciens Theme (moduleId set)     : ${oldThemeIds.length}`);
  console.log(`Anciens SubTheme (sous ces theme): ${oldSubThemeIds.length}`);
  console.log(`Module                           : ${moduleIds.length}`);

  // Garde-fou : aucun Content ne doit plus référencer un de ces anciens SubTheme
  // (sinon la suppression cascaderait sur du contenu pas encore déplacé — signe
  // que migrate-module-to-theme.js n'a pas tourné ou a échoué).
  const remainingContents = oldSubThemeIds.length > 0
    ? await prisma.content.count({ where: { subThemeId: { in: oldSubThemeIds } } })
    : 0;
  if (remainingContents > 0) {
    console.log(`\n❌ ${remainingContents} Content référencent encore un ancien SubTheme — ABANDON.`);
    console.log('Lancez migrate-module-to-theme.js --execute puis --verify avant ce nettoyage.');
    process.exitCode = 1;
    return;
  }

  if (oldThemeIds.length === 0 && moduleIds.length === 0) {
    console.log('\nRien à nettoyer — aucune ancienne donnée Module/Theme détectée.');
    return;
  }

  if (!EXECUTE) {
    console.log('\n🔎 Dry-run — aucune suppression effectuée. Relancer avec --execute pour appliquer.');
    return;
  }

  // Backup avant suppression définitive.
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `pre-cleanup-${tsNow()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ takenAt: new Date().toISOString(), oldThemes, oldSubThemes, modules }, null, 2));
  console.log(`📦 Backup écrit : ${backupFile}`);

  console.log('\n🚀 Suppression réelle...');

  const delSubThemes = oldSubThemeIds.length > 0
    ? await prisma.subTheme.deleteMany({ where: { id: { in: oldSubThemeIds } } })
    : { count: 0 };
  console.log(`✅ SubTheme supprimés : ${delSubThemes.count}`);

  const delThemes = oldThemeIds.length > 0
    ? await prisma.theme.deleteMany({ where: { id: { in: oldThemeIds } } })
    : { count: 0 };
  console.log(`✅ Theme supprimés : ${delThemes.count}`);

  const delModules = moduleIds.length > 0
    ? await prisma.module.deleteMany({ where: { id: { in: moduleIds } } })
    : { count: 0 };
  console.log(`✅ Module supprimés : ${delModules.count}`);

  console.log('\n✅ Nettoyage terminé. Reste : rendre Theme.levelId obligatoire et DROP les tables modules/user_module_progress via une migration Prisma dédiée (manuelle, après relecture du SQL).');
}

main()
  .catch((e) => { console.error('❌ ERREUR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
