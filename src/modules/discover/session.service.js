// session.service.js
class SessionService {
  constructor() {
    // Stockage temporaire des scores en mémoire
    this.tempScores = new Map(); // sessionId -> { scores: {}, totalScore: 0 }
  }

  /**
   * Génère un ID de session temporaire
   */
  generateSessionId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialise une nouvelle session temporaire
   */
  initSession(sessionId = null) {
    const id = sessionId || this.generateSessionId();
    if (!this.tempScores.has(id)) {
      this.tempScores.set(id, {
        scores: {},
        totalScore: 0,
        startedAt: new Date(),
        lastActivity: new Date()
      });
    }
    return id;
  }

  /**
   * Sauvegarde le score d'un exercice dans la session
   */
  saveExerciseScore(sessionId, exerciseId, score, maxScore) {
    const session = this.tempScores.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.scores[exerciseId] = {
      score,
      maxScore,
      completedAt: new Date(),
      percentage: maxScore > 0 ? (score / maxScore) * 100 : 0
    };

    // Recalculer le score total
    session.totalScore = Object.values(session.scores).reduce(
      (total, item) => total + item.score, 
      0
    );
    
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Récupère le score total d'une session
   */
  getSessionScore(sessionId) {
    const session = this.tempScores.get(sessionId);
    if (!session) return null;
    
    const totalMaxScore = Object.values(session.scores).reduce(
      (total, item) => total + item.maxScore, 
      0
    );
    
    return {
      sessionId,
      totalScore: session.totalScore,
      totalMaxScore,
      percentage: totalMaxScore > 0 ? (session.totalScore / totalMaxScore) * 100 : 0,
      scores: session.scores,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity
    };
  }

  /**
   * Nettoie les sessions inactives (plus de 24h)
   */
  cleanupSessions() {
    const now = new Date();
    for (const [id, session] of this.tempScores.entries()) {
      const hoursSinceLastActivity = (now - session.lastActivity) / (1000 * 60 * 60);
      if (hoursSinceLastActivity > 24) {
        this.tempScores.delete(id);
      }
    }
  }
}

module.exports = new SessionService();