// session.service.js
const { prisma } = require('../../config/prisma');

class SessionService {
  constructor() {
    // Initialiser les tâches de nettoyage
    this.startCleanupTask();
  }

  /**
   * Génère un ID de session temporaire
   */
  generateSessionId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialise une nouvelle session temporaire dans la BD
   */
  async initSession(sessionId = null) {
    const id = sessionId || this.generateSessionId();
    
    try {
      // Vérifier si la session existe
      const existing = await prisma.discoverSession.findUnique({
        where: { id }
      });

      if (!existing) {
        // Créer une nouvelle session
        await prisma.discoverSession.create({
          data: {
            id,
            startedAt: new Date(),
            lastActivity: new Date(),
            totalScore: 0
          }
        });
      } else {
        // Mettre à jour lastActivity
        await prisma.discoverSession.update({
          where: { id },
          data: { lastActivity: new Date() }
        });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }

    return id;
  }

  /**
   * Sauvegarde le score d'un exercice dans la session
   */
  async saveExerciseScore(sessionId, exerciseId, score, maxScore) {
    try {
      // Vérifier que la session existe
      const session = await prisma.discoverSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Créer ou mettre à jour le score de l'exercice
      await prisma.discoverSessionExercise.upsert({
        where: {
          sessionId_exerciseId: {
            sessionId,
            exerciseId
          }
        },
        create: {
          sessionId,
          exerciseId,
          score,
          maxScore,
          percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
          completedAt: new Date()
        },
        update: {
          score,
          maxScore,
          percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
          completedAt: new Date()
        }
      });

      // Recalculer et mettre à jour le score total de la session
      const exerciseScores = await prisma.discoverSessionExercise.findMany({
        where: { sessionId },
        select: { score: true }
      });

      const totalScore = exerciseScores.reduce((sum, item) => sum + item.score, 0);

      await prisma.discoverSession.update({
        where: { id: sessionId },
        data: { 
          totalScore,
          lastActivity: new Date()
        }
      });

      return { score, maxScore };
    } catch (error) {
      console.error('Error saving exercise score:', error);
      throw error;
    }
  }

  /**
   * Récupère le score total d'une session
   */
  async getSessionScore(sessionId) {
    try {
      const session = await prisma.discoverSession.findUnique({
        where: { id: sessionId },
        include: {
          exercises: {
            select: {
              exerciseId: true,
              score: true,
              maxScore: true,
              percentage: true,
              completedAt: true
            }
          }
        }
      });

      if (!session) return null;

      const totalMaxScore = session.exercises.reduce((sum, item) => sum + item.maxScore, 0);

      return {
        sessionId,
        totalScore: session.totalScore,
        totalMaxScore,
        percentage: totalMaxScore > 0 ? (session.totalScore / totalMaxScore) * 100 : 0,
        scores: session.exercises,
        startedAt: session.startedAt,
        lastActivity: session.lastActivity,
        exercisesCompleted: session.exercises.length
      };
    } catch (error) {
      console.error('Error getting session score:', error);
      return null;
    }
  }

  /**
   * Nettoie les sessions inactives (plus de 7 jours)
   */
  async cleanupSessions() {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await prisma.discoverSession.deleteMany({
        where: {
          lastActivity: {
            lt: sevenDaysAgo
          }
        }
      });

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} inactive sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }

  /**
   * Lance une tâche de nettoyage toutes les 24 heures
   */
  startCleanupTask() {
    // Nettoyage initial après 1 heure
    setTimeout(() => {
      this.cleanupSessions();
    }, 60 * 60 * 1000);

    // Puis nettoyage toutes les 24 heures
    setInterval(() => {
      this.cleanupSessions();
    }, 24 * 60 * 60 * 1000);
  }
}

module.exports = new SessionService();