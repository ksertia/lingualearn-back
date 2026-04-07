const gamificationService = require('./gamification.service');

// ==================== STATS ====================

/**
 * Récupérer les stats complètes d'un utilisateur
 */
async function getUserStats(req, res, next) {
  try {
    const { userId } = req.params;
    const stats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ajouter des récompenses (XP et coins) à un utilisateur
 */
async function addRewards(req, res, next) {
  try {
    const { userId } = req.params;
    const { xp = 0, coins = 0 } = req.body;
    
    await gamificationService.addRewards(userId, xp, coins);
    const updatedStats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      data: updatedStats,
      message: `Récompenses ajoutées: ${xp} XP, ${coins} coins`
    });
  } catch (error) {
    next(error);
  }
}

// ==================== BADGES ====================

/**
 * Récupérer tous les badges disponibles
 */
async function getAllBadges(req, res, next) {
  try {
    const badges = await gamificationService.getAllBadges();
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les badges d'un utilisateur
 */
async function getUserBadges(req, res, next) {
  try {
    const { userId } = req.params;
    const badges = await gamificationService.getUserBadges(userId);
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vérifier et attribuer les badges débloqués
 */
async function checkBadges(req, res, next) {
  try {
    const { userId } = req.params;
    const newBadges = await gamificationService.checkAndAwardBadges(userId);
    
    res.json({
      success: true,
      data: {
        newBadges: newBadges.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon
        })),
        count: newBadges.length
      },
      message: newBadges.length > 0 
        ? `${newBadges.length} nouveau(x) badge(s) débloqué(s) !`
        : 'Aucun nouveau badge'
    });
  } catch (error) {
    next(error);
  }
}

// ==================== STREAKS ====================

/**
 * Mettre à jour le streak quotidien
 */
async function updateStreak(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await gamificationService.updateDailyStreak(userId);
    
    if (!result) {
      return res.json({
        success: true,
        message: 'Activité déjà enregistrée aujourd\'hui'
      });
    }
    
    res.json({
      success: true,
      data: {
        currentStreak: result.newStreak,
        streakBonus: result.streakBonus
      },
      message: result.streakBonus > 0 
        ? `Streak maintenu ! Bonus: ${result.streakBonus} XP`
        : 'Nouveau streak commencé !'
    });
  } catch (error) {
    next(error);
  }
}

// ==================== LEADERBOARD ====================

/**
 * Récupérer le classement global
 */
async function getLeaderboard(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(parseInt(limit));
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer le rang d'un utilisateur
 */
async function getUserRank(req, res, next) {
  try {
    const { userId } = req.params;
    const rank = await gamificationService.getUserRank(userId);
    const stats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      data: {
        rank,
        level: stats.level,
        totalXp: stats.totalXp,
        totalCoins: stats.totalCoins
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // Stats
  getUserStats,
  addRewards,
  
  // Badges
  getAllBadges,
  getUserBadges,
  checkBadges,
  
  // Streaks
  updateStreak,
  
  // Leaderboard
  getLeaderboard,
  getUserRank
};
