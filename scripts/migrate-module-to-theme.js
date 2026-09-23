/**
 * migrate-module-to-theme.js
 *
 * Migration ponctuelle des données réelles : chaque Module devient un nouveau
 * Theme (rattaché directement à son Level), chaque ancien Theme devient un
 * nouveau SubTheme (fusion de ses 1 ou 2 anciens SubTheme enfants), leurs
 * Content sont fusionnés/réindexés, leurs Evaluation concaténées si besoin.
 * Les progressions utilisateur (UserSubThemeProgress) sont fusionnées puis
 * TOUT le reste (UserThemeProgress, UserLevelProgress) est recalculé via les
 * fonctions existantes de progress.service.js — jamais reconstruit à la main.
 *
 * Ne supprime RIEN de l'ancienne hiérarchie (Module/ancien Theme/ancien
 * SubTheme) — ça reste le rôle de scripts/cleanup-old-module-hierarchy.js,
 * à lancer séparément après validation manuelle du rapport --verify.
 *
 * Usage :
 *   node scripts/migrate-module-to-theme.js                 dry-run (défaut)
 *   node scripts/migrate-module-to-theme.js --execute        exécution réelle
 *   node scripts/migrate-module-to-theme.js --verify          vérifications post-migration
 *   node scripts/migrate-module-to-theme.js --recalc-only     relance uniquement le recalcul de progression
 *   ajouter --force pour ignorer la garde anti-double-exécution
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  recalculateSubThemeProgress,
  recalculateThemeProgress,
  recalculateLevelProgress,
} = require('../src/modules/progress/progress.service');

const EXECUTE = process.argv.includes('--execute');
const VERIFY = process.argv.includes('--verify');
const RECALC_ONLY = process.argv.includes('--recalc-only');
const FORCE = process.argv.includes('--force');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function tsNow() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Sérialise proprement les Decimal Prisma (sinon JSON.stringify sort un objet interne illisible)
function jsonReplacer(key, value) {
  if (value && typeof value === 'object' && typeof value.toFixed === 'function' && value.constructor?.name === 'Decimal') {
    return value.toString();
  }
  return value;
}

async function writeBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const [
    modules, themes, subThemes, contents, contentBlocks,
    evaluations, evaluationAttempts, contentAttempts,
    userModuleProgress, userThemeProgress, userSubThemeProgress, userLevelProgress,
  ] = await Promise.all([
    prisma.module.findMany(),
    prisma.theme.findMany(),
    prisma.subTheme.findMany(),
    prisma.content.findMany(),
    prisma.contentBlock.findMany(),
    prisma.evaluation.findMany(),
    prisma.evaluationAttempt.findMany(),
    prisma.contentAttempt.findMany(),
    prisma.userModuleProgress.findMany(),
    prisma.userThemeProgress.findMany(),
    prisma.userSubThemeProgress.findMany(),
    prisma.userLevelProgress.findMany(),
  ]);

  const backup = {
    meta: {
      takenAt: new Date().toISOString(),
      mode: EXECUTE ? 'pre-execute' : 'dry-run-preview',
      counts: {
        modules: modules.length, themes: themes.length, subThemes: subThemes.length,
        contents: contents.length, contentBlocks: contentBlocks.length,
        evaluations: evaluations.length, evaluationAttempts: evaluationAttempts.length,
        contentAttempts: contentAttempts.length,
        userModuleProgress: userModuleProgress.length, userThemeProgress: userThemeProgress.length,
        userSubThemeProgress: userSubThemeProgress.length, userLevelProgress: userLevelProgress.length,
      },
    },
    modules, themes, subThemes, contents, contentBlocks,
    evaluations, evaluationAttempts, contentAttempts,
    userModuleProgress, userThemeProgress, userSubThemeProgress, userLevelProgress,
  };

  const file = path.join(BACKUP_DIR, `pre-module-migration-${tsNow()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, jsonReplacer, 2));
  console.log(`📦 Backup écrit : ${file}`);
  return file;
}

// Construit le plan complet en mémoire, sans écrire quoi que ce soit.
async function buildPlan() {
  const modules = await prisma.module.findMany({
    orderBy: [{ levelId: 'asc' }, { index: 'asc' }],
    include: {
      themes: {
        orderBy: { index: 'asc' },
        include: {
          subThemes: {
            orderBy: { index: 'asc' },
            include: {
              contents: { orderBy: { index: 'asc' } },
              evaluation: true,
            },
          },
        },
      },
    },
  });

  const plan = modules.map((module_) => {
    const subThemeGroups = module_.themes.map((oldTheme) => {
      // Concatène les Content de tous les anciens SubTheme de cet ancien Theme, dans l'ordre.
      const mergedContents = [];
      oldTheme.subThemes.forEach((oldSubTheme) => {
        oldSubTheme.contents.forEach((c) => mergedContents.push({ content: c, fromSubTheme: oldSubTheme }));
      });
      const contentsWithNewIndex = mergedContents.map((entry, i) => ({ ...entry, newIndex: i }));

      const isDemo = oldTheme.subThemes.some((st) => st.isDemo);

      const evals = oldTheme.subThemes
        .map((st) => st.evaluation)
        .filter(Boolean);

      let evaluationPlan = null;
      if (evals.length === 1) {
        evaluationPlan = { mode: 'reuse', source: evals[0], merged: null };
      } else if (evals.length >= 2) {
        const [first, second] = evals;
        const firstQuestions = Array.isArray(first.questions) ? first.questions : [];
        const secondQuestions = Array.isArray(second.questions) ? second.questions : [];
        evaluationPlan = {
          mode: 'merge',
          source: first,
          merged: {
            title: `${first.title} + ${second.title}`,
            description: [first.description, second.description].filter(Boolean).join(' / ') || null,
            questions: [...firstQuestions, ...secondQuestions],
            passingScore: first.passingScore,
            maxAttempts: first.maxAttempts,
            timeLimitMinutes: first.timeLimitMinutes,
            isActive: first.isActive,
          },
          oldEvaluationIds: evals.map((e) => e.id),
        };
      }

      return {
        oldTheme,
        newSubTheme: {
          title: oldTheme.title,
          description: oldTheme.description,
          index: oldTheme.index,
          isActive: oldTheme.isActive,
          isDemo,
        },
        contentsWithNewIndex,
        evaluationPlan,
        oldSubThemeIds: oldTheme.subThemes.map((st) => st.id),
      };
    });

    return {
      module: module_,
      newTheme: {
        title: module_.title,
        description: module_.description,
        iconUrl: module_.iconUrl,
        levelId: module_.levelId,
        index: module_.index,
        isActive: module_.isActive,
      },
      subThemeGroups,
    };
  });

  return plan;
}

function printPlanSummary(plan) {
  let totalNewSubThemes = 0, totalContents = 0, totalMergedEval = 0, totalReuseEval = 0, totalNoEval = 0;
  for (const entry of plan) {
    for (const group of entry.subThemeGroups) {
      totalNewSubThemes++;
      totalContents += group.contentsWithNewIndex.length;
      if (group.evaluationPlan?.mode === 'merge') totalMergedEval++;
      else if (group.evaluationPlan?.mode === 'reuse') totalReuseEval++;
      else totalNoEval++;
    }
  }
  console.log('\n=== PLAN DE MIGRATION ===');
  console.log(`Modules → nouveaux Theme       : ${plan.length}`);
  console.log(`Anciens Theme → nouveaux SubTheme : ${totalNewSubThemes}`);
  console.log(`Content déplacés               : ${totalContents}`);
  console.log(`Evaluations fusionnées (2→1)   : ${totalMergedEval}`);
  console.log(`Evaluations reprises (1→1)     : ${totalReuseEval}`);
  console.log(`SubTheme sans Evaluation       : ${totalNoEval}`);

  console.log('\n--- Détail par Module (5 premiers) ---');
  plan.slice(0, 5).forEach((entry) => {
    console.log(`Module "${entry.module.title}" (level ${entry.newTheme.levelId}) → Theme, ${entry.subThemeGroups.length} SubTheme(s) :`);
    entry.subThemeGroups.forEach((g) => {
      const evalInfo = g.evaluationPlan?.mode === 'merge' ? `eval fusionnée (${g.evaluationPlan.merged.questions.length}q)`
        : g.evaluationPlan?.mode === 'reuse' ? 'eval reprise' : 'sans eval';
      console.log(`   - "${g.newSubTheme.title}" : ${g.contentsWithNewIndex.length} content(s), ${evalInfo}, isDemo=${g.newSubTheme.isDemo}`);
    });
  });
}

// Fusionne les completedContentIds/dates de deux UserSubThemeProgress (même utilisateur, groupe fusionné).
function mergeProgressRows(a, b, evaluationWasMerged) {
  const setA = new Set(Array.isArray(a?.completedContentIds) ? a.completedContentIds : []);
  const setB = new Set(Array.isArray(b?.completedContentIds) ? b.completedContentIds : []);
  const completedContentIds = Array.from(new Set([...setA, ...setB]));

  const dates = (x) => (x ? new Date(x).getTime() : null);
  const minDate = (x, y) => {
    const dx = dates(x), dy = dates(y);
    if (dx === null) return y;
    if (dy === null) return x;
    return dx <= dy ? x : y;
  };
  const maxDateNonNull = (x, y) => {
    const dx = dates(x), dy = dates(y);
    if (dx === null) return y;
    if (dy === null) return x;
    return dx >= dy ? x : y;
  };

  const startedAt = minDate(a?.startedAt, b?.startedAt);
  const completedAt = (a?.completedAt && b?.completedAt) ? maxDateNonNull(a.completedAt, b.completedAt) : null;
  const lastAccessedAt = maxDateNonNull(a?.lastAccessedAt, b?.lastAccessedAt);
  const evaluationScore = evaluationWasMerged ? null : (a?.evaluationScore ?? b?.evaluationScore ?? null);

  return { completedContentIds, startedAt, completedAt, lastAccessedAt, evaluationScore };
}

async function execute(plan) {
  const touchedSubThemes = new Set(); // "userId|newSubThemeId"
  const touchedThemes = new Set();    // "userId|newThemeId"
  const touchedLevels = new Set();    // "userId|levelId"

  let createdThemes = 0, createdSubThemes = 0, movedContents = 0, createdEvaluations = 0, movedAttempts = 0;
  let createdProgress = 0, mergedProgress = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Créer les nouveaux Theme avec un index provisoire pour éviter toute collision.
    const newThemeIdByModuleId = new Map();
    for (const entry of plan) {
      const created = await tx.theme.create({
        data: {
          title: entry.newTheme.title,
          description: entry.newTheme.description,
          iconUrl: entry.newTheme.iconUrl,
          levelId: entry.newTheme.levelId,
          moduleId: null,
          index: 10000 + entry.newTheme.index,
          isActive: entry.newTheme.isActive,
        },
      });
      newThemeIdByModuleId.set(entry.module.id, created.id);
      createdThemes++;
    }

    // 1bis. Renuméroter proprement les index par Level (0..n-1), pour respecter l'ordre voulu.
    const byLevel = new Map();
    for (const entry of plan) {
      const levelId = entry.newTheme.levelId;
      if (!byLevel.has(levelId)) byLevel.set(levelId, []);
      byLevel.get(levelId).push({ themeId: newThemeIdByModuleId.get(entry.module.id), index: entry.newTheme.index });
    }
    for (const [, list] of byLevel) {
      list.sort((a, b) => a.index - b.index);
      for (let i = 0; i < list.length; i++) {
        await tx.theme.update({ where: { id: list[i].themeId }, data: { index: i } });
      }
    }

    // 2. Créer les nouveaux SubTheme, déplacer les Content, créer/fusionner les Evaluation.
    for (const entry of plan) {
      const newThemeId = newThemeIdByModuleId.get(entry.module.id);

      for (const group of entry.subThemeGroups) {
        const newSubTheme = await tx.subTheme.create({
          data: {
            themeId: newThemeId,
            title: group.newSubTheme.title,
            description: group.newSubTheme.description,
            index: group.newSubTheme.index,
            isActive: group.newSubTheme.isActive,
            isDemo: group.newSubTheme.isDemo,
          },
        });
        createdSubThemes++;

        for (const { content, newIndex } of group.contentsWithNewIndex) {
          await tx.content.update({
            where: { id: content.id },
            data: { subThemeId: newSubTheme.id, index: newIndex },
          });
          movedContents++;
        }

        let newEvaluationId = null;
        if (group.evaluationPlan?.mode === 'reuse') {
          const src = group.evaluationPlan.source;
          const created = await tx.evaluation.create({
            data: {
              subThemeId: newSubTheme.id,
              title: src.title,
              description: src.description,
              questions: src.questions,
              passingScore: src.passingScore,
              maxAttempts: src.maxAttempts,
              timeLimitMinutes: src.timeLimitMinutes,
              isActive: src.isActive,
            },
          });
          newEvaluationId = created.id;
          createdEvaluations++;

          const attempts = await tx.evaluationAttempt.findMany({ where: { evaluationId: src.id } });
          for (const att of attempts) {
            await tx.evaluationAttempt.update({ where: { id: att.id }, data: { evaluationId: newEvaluationId } });
            movedAttempts++;
          }
        } else if (group.evaluationPlan?.mode === 'merge') {
          const m = group.evaluationPlan.merged;
          const created = await tx.evaluation.create({
            data: {
              subThemeId: newSubTheme.id,
              title: m.title,
              description: m.description,
              questions: m.questions,
              passingScore: m.passingScore,
              maxAttempts: m.maxAttempts,
              timeLimitMinutes: m.timeLimitMinutes,
              isActive: m.isActive,
            },
          });
          newEvaluationId = created.id;
          createdEvaluations++;

          const attempts = await tx.evaluationAttempt.findMany({
            where: { evaluationId: { in: group.evaluationPlan.oldEvaluationIds } },
          });
          for (const att of attempts) {
            await tx.evaluationAttempt.update({ where: { id: att.id }, data: { evaluationId: newEvaluationId } });
            movedAttempts++;
          }
        }

        // 3. Fusionner/créer les UserSubThemeProgress pour ce groupe.
        const oldProgressRows = group.oldSubThemeIds.length > 0
          ? await tx.userSubThemeProgress.findMany({ where: { subThemeId: { in: group.oldSubThemeIds } } })
          : [];

        const byUser = new Map();
        for (const row of oldProgressRows) {
          if (!byUser.has(row.userId)) byUser.set(row.userId, []);
          byUser.get(row.userId).push(row);
        }

        for (const [userId, rows] of byUser) {
          const evaluationWasMerged = group.evaluationPlan?.mode === 'merge';
          let data;
          if (rows.length === 1) {
            data = {
              completedContentIds: rows[0].completedContentIds,
              startedAt: rows[0].startedAt,
              completedAt: rows[0].completedAt,
              lastAccessedAt: rows[0].lastAccessedAt,
              evaluationScore: evaluationWasMerged ? null : rows[0].evaluationScore,
            };
          } else {
            data = mergeProgressRows(rows[0], rows[1], evaluationWasMerged);
            mergedProgress++;
          }

          await tx.userSubThemeProgress.create({
            data: {
              userId,
              subThemeId: newSubTheme.id,
              progressPercentage: 0, // placeholder, recalculé juste après le commit
              completedContentIds: data.completedContentIds,
              evaluationScore: data.evaluationScore,
              startedAt: data.startedAt,
              completedAt: data.completedAt,
              lastAccessedAt: data.lastAccessedAt,
            },
          });
          createdProgress++;

          touchedSubThemes.add(`${userId}|${newSubTheme.id}`);
          touchedThemes.add(`${userId}|${newThemeId}`);
          touchedLevels.add(`${userId}|${entry.newTheme.levelId}`);
        }
      }
    }
  }, { timeout: 30000, maxWait: 10000 });

  console.log(`\n✅ Restructuration commitée : ${createdThemes} Theme, ${createdSubThemes} SubTheme, ${movedContents} Content déplacés, ${createdEvaluations} Evaluation créées, ${movedAttempts} EvaluationAttempt réattribués, ${createdProgress} UserSubThemeProgress (dont ${mergedProgress} fusionnées).`);

  await recalcTouched(touchedSubThemes, touchedThemes, touchedLevels);
}

async function recalcTouched(touchedSubThemes, touchedThemes, touchedLevels) {
  console.log('\n⏳ Recalcul de la progression (hors transaction, via les fonctions existantes)...');

  for (const key of touchedSubThemes) {
    const [userId, subThemeId] = key.split('|');
    await recalculateSubThemeProgress(userId, subThemeId);
  }
  for (const key of touchedThemes) {
    const [userId, themeId] = key.split('|');
    await recalculateThemeProgress(userId, themeId);
  }
  for (const key of touchedLevels) {
    const [userId, levelId] = key.split('|');
    await recalculateLevelProgress(userId, levelId);
  }

  console.log(`✅ Recalcul terminé : ${touchedSubThemes.size} SubTheme, ${touchedThemes.size} Theme, ${touchedLevels.size} Level.`);
}

// Reprise ciblée : relit tous les nouveaux SubTheme (moduleId=null sur leur Theme parent, levelId set)
// et relance le recalcul pour tous les utilisateurs ayant une UserSubThemeProgress dessus.
async function recalcOnly() {
  const newSubThemes = await prisma.subTheme.findMany({
    where: { theme: { moduleId: null, levelId: { not: null } } },
    include: { theme: { select: { id: true, levelId: true } } },
  });
  if (newSubThemes.length === 0) {
    console.log('Aucun nouveau SubTheme détecté (theme.moduleId=null, levelId renseigné). Rien à recalculer.');
    return;
  }

  const touchedSubThemes = new Set();
  const touchedThemes = new Set();
  const touchedLevels = new Set();

  for (const st of newSubThemes) {
    const rows = await prisma.userSubThemeProgress.findMany({ where: { subThemeId: st.id }, select: { userId: true } });
    for (const row of rows) {
      touchedSubThemes.add(`${row.userId}|${st.id}`);
      touchedThemes.add(`${row.userId}|${st.theme.id}`);
      touchedLevels.add(`${row.userId}|${st.theme.levelId}`);
    }
  }

  await recalcTouched(touchedSubThemes, touchedThemes, touchedLevels);
}

async function verify() {
  console.log('\n=== VÉRIFICATION POST-MIGRATION ===');
  const checks = [];

  const newThemes = await prisma.theme.findMany({ where: { moduleId: null, levelId: { not: null } } });
  const newSubThemes = await prisma.subTheme.findMany({ where: { theme: { moduleId: null, levelId: { not: null } } } });
  const oldThemeCount = await prisma.theme.count({ where: { moduleId: { not: null } } });
  const oldSubThemeCount = await prisma.subTheme.count({ where: { theme: { moduleId: { not: null } } } });
  const moduleCount = await prisma.module.count();

  checks.push([`Nouveaux Theme créés (attendu ${moduleCount})`, newThemes.length === moduleCount, `obtenu ${newThemes.length}`]);
  checks.push([`Nouveaux SubTheme créés (attendu ${oldThemeCount})`, newSubThemes.length === oldThemeCount, `obtenu ${newSubThemes.length}`]);

  // Aucun Content orphelin sous un ancien SubTheme
  const oldSubThemeIds = (await prisma.subTheme.findMany({ where: { theme: { moduleId: { not: null } } }, select: { id: true } })).map(s => s.id);
  const orphanContents = oldSubThemeIds.length > 0
    ? await prisma.content.count({ where: { subThemeId: { in: oldSubThemeIds } } })
    : 0;
  checks.push(['Aucun Content resté sous un ancien SubTheme', orphanContents === 0, `orphelins: ${orphanContents}`]);

  // Index séquentiels sans trou/doublon par nouveau SubTheme
  let indexIssues = 0;
  for (const st of newSubThemes) {
    const contents = await prisma.content.findMany({ where: { subThemeId: st.id }, orderBy: { index: 'asc' }, select: { index: true } });
    const indexes = contents.map(c => c.index);
    const expected = indexes.map((_, i) => i);
    if (JSON.stringify(indexes) !== JSON.stringify(expected)) indexIssues++;
  }
  checks.push(['Index Content séquentiels sans trou/doublon (par SubTheme)', indexIssues === 0, `SubTheme en défaut: ${indexIssues}`]);

  // EvaluationAttempt : chaque evaluationId doit exister
  const attempts = await prisma.evaluationAttempt.findMany({ select: { id: true, evaluationId: true } });
  let danglingAttempts = 0;
  for (const a of attempts) {
    const exists = await prisma.evaluation.findUnique({ where: { id: a.evaluationId }, select: { id: true } });
    if (!exists) danglingAttempts++;
  }
  checks.push(['Aucun EvaluationAttempt orphelin', danglingAttempts === 0, `orphelins: ${danglingAttempts}`]);

  // UserSubThemeProgress : progressPercentage dans [0,100]
  const newProgressRows = await prisma.userSubThemeProgress.findMany({
    where: { subTheme: { theme: { moduleId: null, levelId: { not: null } } } },
    select: { progressPercentage: true },
  });
  const outOfRange = newProgressRows.filter(r => Number(r.progressPercentage) < 0 || Number(r.progressPercentage) > 100).length;
  checks.push(['UserSubThemeProgress.progressPercentage dans [0,100]', outOfRange === 0, `hors bornes: ${outOfRange}`]);

  console.log('');
  let allPass = true;
  checks.forEach(([label, pass, detail]) => {
    console.log(`${pass ? '✅' : '❌'} ${label} — ${detail}`);
    if (!pass) allPass = false;
  });

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const reportFile = path.join(BACKUP_DIR, `verification-report-${tsNow()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify({ takenAt: new Date().toISOString(), allPass, checks }, null, 2));
  console.log(`\n📄 Rapport écrit : ${reportFile}`);
  console.log(allPass ? '\n✅ Toutes les vérifications passent.' : '\n❌ Des anomalies ont été détectées — ne pas lancer le cleanup avant investigation.');
}

async function main() {
  if (RECALC_ONLY) {
    await recalcOnly();
    return;
  }

  if (VERIFY) {
    await verify();
    return;
  }

  const alreadyMigrated = await prisma.theme.count({ where: { moduleId: null, levelId: { not: null } } });
  if (alreadyMigrated > 0 && !FORCE) {
    console.log(`⚠️  ${alreadyMigrated} Theme déjà migrés détectés (moduleId=null, levelId renseigné).`);
    console.log('Le script semble avoir déjà tourné. Utilisez --recalc-only, --verify, ou --force pour ignorer cette garde.');
    return;
  }

  await writeBackup();

  const plan = await buildPlan();
  printPlanSummary(plan);

  if (!EXECUTE) {
    console.log('\n🔎 Dry-run — aucune écriture effectuée. Relancer avec --execute pour appliquer.');
    return;
  }

  console.log('\n🚀 Exécution réelle...');
  await execute(plan);
  console.log('\n✅ Migration terminée. Lancez --verify avant tout nettoyage.');
}

main()
  .catch((e) => { console.error('❌ ERREUR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
