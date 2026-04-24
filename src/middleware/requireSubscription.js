const { prisma } = require('../config/prisma');
const { AppError } = require('./errorHandler');

// Rôles exemptés : accès libre sans abonnement
const EXEMPT_ROLES = ['admin', 'plateform_manager', 'teacher'];

/**
 * Résout l'abonnement actif pour un utilisateur donné.
 *
 * - Si c'est un parent (learner)       → on vérifie son propre abonnement
 * - Si c'est un sous-compte            → on remonte au parent et on vérifie le sien
 *
 * Retourne { subscription, plan } si valide, sinon lance une AppError.
 */
async function resolveActiveSubscription(user) {
  let ownerId = user.id;

  if (user.accountType === 'sub_account_learner') {
    // parentId disponible directement depuis req.user (chargé par authMiddleware)
    const parentId = user.parentId;

    if (!parentId) {
      throw new AppError(403, 'Sous-compte sans parent associé.');
    }

    ownerId = parentId;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new AppError(403, 'Aucun abonnement actif. Veuillez souscrire à un forfait.');
  }

  if (subscription.status !== 'active') {
    throw new AppError(403, 'Votre abonnement est inactif ou annulé.');
  }

  if (new Date() > new Date(subscription.currentPeriodEnd)) {
    throw new AppError(403, 'Votre abonnement a expiré. Veuillez le renouveler.');
  }

  return { subscription, plan: subscription.plan };
}

/**
 * Middleware principal.
 * Attache req.subscription et req.plan si valide.
 * Les rôles exemptés (admin, teacher, plateform_manager) passent sans vérification.
 */
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentification requise.'));
    }

    // Rôles privilégiés : pas de contrainte d'abonnement
    if (EXEMPT_ROLES.includes(req.user.accountType)) {
      return next();
    }

    const { subscription, plan } = await resolveActiveSubscription(req.user);

    // Rendre disponible dans les controllers si besoin
    req.subscription = subscription;
    req.plan = plan;

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireSubscription };
