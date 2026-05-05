const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheGet, cacheSet, cacheDel, TTL } = require('../../utils/cache');

class LevelService {
    async invalidateCache(levelId = null, languageId = null) {
        const keys = ['levels:all'];
        if (levelId) keys.push(`level:${levelId}`, `level:${levelId}:full`);
        if (languageId) keys.push(`levels:language:${languageId}`);
        await cacheDel(...keys);
    }

    // Récupérer tous les niveaux liés à un utilisateur (optimisé)
    async getLevelsByUserId(userId) {
        const cacheKey = `user-levels:${userId}`;
        const cached = await cacheGet(cacheKey);
        if (cached !== null) return cached;

        // 1. Trouver la langue actuelle de l'utilisateur
        const userLanguageProgress = await prisma.userLanguageProgress.findFirst({
            where: { userId },
            orderBy: [
                { lastAccessedAt: 'desc' },
                { createdAt: 'desc' }
            ],
            select: {
                languageId: true,
                language: {
                    select: {
                        id: true,
                        code: true,
                        name: true
                    }
                }
            }
        });

        if (!userLanguageProgress) {
            return [];
        }

        // 2. Récupérer TOUS les niveaux de la langue avec leur progression en une seule requête
        const levels = await prisma.level.findMany({
            where: { 
                languageId: userLanguageProgress.languageId,
                isActive: true  // Ne retourner que les niveaux actifs
            },
            orderBy: { index: 'asc' },
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                index: true,
                isActive: true,
                languageId: true,
                userProgress: {
                    where: { userId },
                    select: {
                        status: true,
                        progressPercentage: true,
                        totalXp: true,
                        timeSpentMinutes: true,
                        unlockedAt: true,
                        startedAt: true,
                        completedAt: true,
                        lastAccessedAt: true
                    }
                },
                _count: {
                    select: {
                        modules: {
                            where: { isActive: true }
                        }
                    }
                }
            }
        });

        const result = levels.map(level => ({
            id: level.id,
            code: level.code,
            name: level.name,
            description: level.description,
            index: level.index,
            isActive: level.isActive,
            languageId: level.languageId,
            totalModules: level._count.modules,
            
            // Progression (peut être null si jamais touché)
            progress: level.userProgress[0] || null,
            
            // Statut calculé
            status: level.userProgress[0]?.status || 'locked',
            progressPercentage: level.userProgress[0]?.progressPercentage || 0,
            totalXp: level.userProgress[0]?.totalXp || 0,
            timeSpentMinutes: level.userProgress[0]?.timeSpentMinutes || 0,
            unlockedAt: level.userProgress[0]?.unlockedAt || null,
            startedAt: level.userProgress[0]?.startedAt || null,
            completedAt: level.userProgress[0]?.completedAt || null,
            lastAccessedAt: level.userProgress[0]?.lastAccessedAt || null
        }));

        await cacheSet(cacheKey, result, TTL.SHORT);
        return result;
    }

    async createLevel(data) {
        // Indexation automatique par langue
        let index = data.index;
        if (typeof index !== 'number' || isNaN(index)) {
            const max = await prisma.level.aggregate({
                where: { languageId: data.languageId },
                _max: { index: true }
            });
            index = (max._max.index ?? 0) + 1;
        }

        // Vérifier unicité de l'index pour la langue
        const existing = await prisma.level.findFirst({ 
            where: { 
                languageId: data.languageId, 
                index 
            },
            select: { id: true }
        });
        
        if (existing) {
            throw new Error('Un niveau avec ce même index existe déjà pour cette langue.');
        }

        // S'assurer que le champ code est toujours présent
        const code = data.code ?? `LEVEL-${index}`;
        
        const level = await prisma.level.create({ 
            data: { ...data, index, code } 
        });
        
        // Invalider le cache
        await this.invalidateCache(null, data.languageId);
        
        return level;
    }

    async getAllLevels() {
        const cached = await cacheGet('levels:all');
        if (cached !== null) return cached;

        const levels = await prisma.level.findMany({
            orderBy: { index: 'asc' },
            include: {
                language: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        isActive: true
                    }
                },
                _count: {
                    select: {
                        modules: {
                            where: { isActive: true }
                        }
                    }
                }
            }
        });

        await cacheSet('levels:all', levels, TTL.LONG);
        return levels;
    }

    async getLevelById(id) {
        const cached = await cacheGet(`level:${id}`);
        if (cached !== null) return cached;

        const level = await prisma.level.findUnique({ 
            where: { id },
            include: {
                language: {
                    select: {
                        id: true,
                        code: true,
                        name: true
                    }
                },
                modules: {
                    where: { isActive: true },
                    orderBy: { index: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        index: true,
                        isActive: true,
                        _count: {
                            select: {
                                paths: {
                                    where: { isActive: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        await cacheSet(`level:${id}`, level, TTL.LONG);
        return level;
    }

    async updateLevel(id, data) {
        const level = await prisma.level.update({ 
            where: { id }, 
            data 
        });
        
        // Invalider le cache
        await this.invalidateCache(id, level.languageId);
        
        return level;
    }

    async deleteLevel(id) {
        // Vérifier si le niveau a des dépendances
        const modules = await prisma.module.findFirst({
            where: { levelId: id },
            select: { id: true }
        });
        
        if (modules) {
            throw new Error('Impossible de supprimer un niveau qui contient des modules');
        }
        
        const level = await prisma.level.delete({ 
            where: { id } 
        });
        
        // Invalider le cache
        await this.invalidateCache(id, level.languageId);
        
        return level;
    }

    // Progression utilisateur pour Level (optimisée)
    async selectLevelForUser(userId, levelId) {
        // Vérifier si le niveau existe et est actif
        const level = await prisma.level.findUnique({
            where: { id: levelId, isActive: true },
            select: { id: true, languageId: true }
        });
        
        if (!level) {
            throw new Error('Niveau introuvable ou inactif');
        }

        const existing = await prisma.userLevelProgress.findUnique({
            where: { userId_levelId: { userId, levelId } }
        });

        const progress = await prisma.userLevelProgress.upsert({
            where: { userId_levelId: { userId, levelId } },
            update: { lastAccessedAt: new Date() },
            create: {
                userId,
                levelId,
                status: 'unlocked',
                unlockedAt: new Date(),
                lastAccessedAt: new Date()
            }
        });

        // Si c'est une première sélection, débloquer module1 → parcours1 → étape1
        if (!existing) {
            await progressionService.unlockModuleWithChildren(userId, (await prisma.module.findFirst({
                where: { levelId, isActive: true },
                orderBy: { index: 'asc' },
                select: { id: true }
            }))?.id);
        }

        await this.invalidateCache(null, level.languageId);
        await cacheDel(`user-levels:${userId}`);
        return progress;
    }

    // Méthode helper pour débloquer le contenu d'un niveau
    async unlockLevelContent(userId, levelId) {
        // Débloquer automatiquement le premier module du niveau
        const firstModule = await prisma.module.findFirst({
            where: { levelId, isActive: true },
            orderBy: { index: 'asc' },
            select: { id: true }
        });
        
        if (!firstModule) return;

        // Créer la progression pour le premier module
        await prisma.userModuleProgress.upsert({
            where: { userId_moduleId: { userId, moduleId: firstModule.id } },
            update: { 
                status: 'unlocked',
                unlockedAt: new Date(),
                lastAccessedAt: new Date()
            },
            create: {
                userId,
                moduleId: firstModule.id,
                status: 'unlocked',
                unlockedAt: new Date(),
                lastAccessedAt: new Date()
            }
        });

        // Débloquer le premier parcours
        const firstPath = await prisma.path.findFirst({
            where: { moduleId: firstModule.id, isActive: true },
            orderBy: { index: 'asc' },
            select: { id: true }
        });
        
        if (firstPath) {
            await prisma.userPathProgress.upsert({
                where: { userId_pathId: { userId, pathId: firstPath.id } },
                update: { 
                    status: 'unlocked',
                    unlockedAt: new Date(),
                    lastAccessedAt: new Date()
                },
                create: {
                    userId,
                    pathId: firstPath.id,
                    status: 'unlocked',
                    unlockedAt: new Date(),
                    lastAccessedAt: new Date()
                }
            });

            // Débloquer la première étape
            const firstStep = await prisma.step.findFirst({
                where: { pathId: firstPath.id, isActive: true },
                orderBy: { index: 'asc' },
                select: { id: true }
            });
            
            if (firstStep) {
                await prisma.userStepProgress.upsert({
                    where: { userId_stepId: { userId, stepId: firstStep.id } },
                    update: { 
                        status: 'unlocked',
                        unlockedAt: new Date(),
                        lastAccessedAt: new Date()
                    },
                    create: {
                        userId,
                        stepId: firstStep.id,
                        status: 'unlocked',
                        unlockedAt: new Date(),
                        lastAccessedAt: new Date()
                    }
                });
            }
        }
    }

    async startLevelForUser(userId, levelId) {
        // Vérifier que la progression existe
        const existing = await prisma.userLevelProgress.findUnique({
            where: { userId_levelId: { userId, levelId } },
            select: { id: true }
        });
        
        if (!existing) {
            throw new Error('Niveau non sélectionné pour cet utilisateur');
        }

        return prisma.userLevelProgress.update({
            where: { userId_levelId: { userId, levelId } },
            data: { 
                status: 'started', 
                startedAt: new Date(),
                lastAccessedAt: new Date()
            }
        });
    }

    async completeLevelForUser(userId, levelId) {
        const result = await prisma.userLevelProgress.update({
            where: { userId_levelId: { userId, levelId } },
            data: { 
                status: 'completed', 
                completedAt: new Date(),
                progressPercentage: 100
            }
        });
        
        // Invalider le cache
        await this.invalidateCache(null);
        
        return result;
    }

    // Compléter un niveau avec déblocage automatique du suivant
    async completeLevelWithAutoUnlock(userId, levelId) {
        const result = await progressionService.completeLevelAndUnlockNext(userId, levelId);
        
        // Invalider le cache
        await this.invalidateCache(null);
        
        return result;
    }

    async activateLevel(id) {
        const level = await prisma.level.findUnique({ 
            where: { id },
            select: { id: true, languageId: true }
        });
        
        if (!level) {
            throw new Error('Niveau introuvable');
        }
        
        const result = await prisma.level.update({
            where: { id },
            data: { isActive: true }
        });
        
        await this.invalidateCache(id, level.languageId);
        
        return result;
    }

    async deactivateLevel(id) {
        const level = await prisma.level.findUnique({ 
            where: { id },
            select: { id: true, languageId: true }
        });
        
        if (!level) {
            throw new Error('Niveau introuvable');
        }
        
        const result = await prisma.level.update({
            where: { id },
            data: { isActive: false }
        });
        
        await this.invalidateCache(id, level.languageId);
        
        return result;
    }

}

const levelService = new LevelService();

module.exports = levelService;