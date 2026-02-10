/**
 * Helper pour la création d'utilisateurs avec des valeurs par défaut cohérentes
 * Garantit que tous les comptes sont actifs et vérifiés par défaut
 */
const getDefaultUserData = (userData) => {
  return {
    ...userData,
    isActive: true,  // Tous les comptes sont actifs par défaut
    isVerified: true, // Tous les comptes sont vérifiés par défaut
    firstLogin: true  // Premier login à true par défaut
  };
};

/**
 * Helper pour la création d'utilisateurs via Prisma avec les valeurs par défaut
 */
const createUserWithDefaults = async (prisma, userData, options = {}) => {
  const defaultUserData = getDefaultUserData(userData);
  
  return await prisma.user.create({
    data: defaultUserData,
    include: options.include || { profile: true },
    ...options
  });
};

module.exports = {
  getDefaultUserData,
  createUserWithDefaults
};
