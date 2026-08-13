const { prisma } = require('../config/prisma');
const { createNotification } = require('../modules/notification/notification.service');

const CONTENT_TYPES = {
  module:     { label: 'Nouveau module',     icon: null, url: (id) => `/modules/${id}` },
  theme:      { label: 'Nouveau thème',      icon: null, url: (id) => `/themes/${id}` },
  'sub-theme':{ label: 'Nouveau sous-thème', icon: null, url: (id) => `/sub-themes/${id}` },
  content:    { label: 'Nouveau contenu',    icon: null, url: (id) => `/contents/${id}` },
  evaluation: { label: 'Nouvelle évaluation',icon: null, url: (id) => `/evaluations/${id}` },
};

/**
 * Notifie tous les learners actifs qu'un nouveau contenu est disponible.
 * Appel non bloquant — ne jamais await dans un hot-path.
 */
async function notifyLearnersNewContent(type, { id, title, languageId = null }) {
  const meta = CONTENT_TYPES[type];
  if (!meta) return;

  try {
    // Récupérer tous les learners actifs (avec abonnement si langue ciblée)
    const where = {
      accountType: { in: ['learner', 'sub_account_learner'] },
      isActive: true,
    };

    // Si contenu lié à une langue, ne notifier que les learners ayant cette langue
    if (languageId) {
      where.userLanguageProgress = { some: { languageId } };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (users.length === 0) return;

    // Insertion en batch pour éviter N requêtes
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId:           u.id,
        notificationType: `new_${type}`,
        title:            `${meta.label} disponible`,
        message:          `"${title}" vient d'être ajouté. Découvrez-le maintenant !`,
        actionUrl:        meta.url(id),
      })),
      skipDuplicates: true,
    });

    // Invalider le cache unread de chaque user
    const { cacheDel } = require('./cache');
    await Promise.all(users.map(u => cacheDel(`notif:${u.id}:unread`).catch(() => {})));

  } catch (err) {
    // Ne jamais faire planter le service appelant
    const { logger } = require('./logger');
    logger.error(`[contentNotifier] Erreur notification ${type}: ${err.message}`);
  }
}

module.exports = { notifyLearnersNewContent };
