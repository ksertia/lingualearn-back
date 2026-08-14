const { prisma } = require('../../config/prisma');
const { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern, TTL } = require('../../utils/cache');
const { syncAllUsersProgression } = require('../../utils/progressionSync');
const { deriveState } = require('../progress/progress.service');

class LevelService {
    async invalidateCache(levelId = null, languageId = null) {
        const keys = ['levels:all'];
        if (levelId) keys.push(`level:${levelId}`, `level:${levelId}:full`);
        if (languageId) keys.push(`levels:language:${languageId}`, `language:${languageId}:levels`, `language:${languageId}:available-levels`);
        await Promise.all([
            cacheDel(...keys),
            cacheInvalidatePattern('user-levels:*'),
        ]).catch(() => {});
    }

    // Récupérer tous les niveaux liés à un utilisateur (optimisé)
    // languageId optionnel : si fourni, retourne les niveaux de cette langue directement
    async getLevelsByUserId(userId, languageId = null) {
        const cacheKey = languageId ? `user-levels:${userId}:${languageId}` : `user-levels:${userId}`;
        const cached = await cacheGet(cacheKey);
        if (cached !== null) return cached;

        // Résoudre la langue : celle fournie en param, sinon la dernière active de l'utilisateur
        let resolvedLanguageId = languageId;
        if (!resolvedLanguageId) {
            const userLanguageProgress = await prisma.userLanguageProgress.findFirst({
                where: { userId },
                orderBy: [{ lastAccessedAt: 'desc' }, { createdAt: 'desc' }],
                select: { languageId: true }
            });
            if (!userLanguageProgress) return [];
            resolvedLanguageId = userLanguageProgress.languageId;
        }

        // Récupérer TOUS les niveaux de la langue avec leur progression en une seule requête
        const levels = await prisma.level.findMany({
            where: {
                languageId: resolvedLanguageId,
                isActive: true
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
                        progressPercentage: true,
                        totalXp: true,
                        timeSpentMinutes: true,
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

            state: deriveState(level.userProgress[0] || {}),
            progressPercentage: level.userProgress[0]?.progressPercentage || 0,
            totalXp: level.userProgress[0]?.totalXp || 0,
            timeSpentMinutes: level.userProgress[0]?.timeSpentMinutes || 0,
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

        await this.invalidateCache(null, data.languageId);
        syncAllUsersProgression({ levelId: level.id, languageId: data.languageId }, 'create').catch(() => {});

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
                        title: true,
                        index: true,
                        isActive: true,
                        _count: {
                            select: {
                                themes: {
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
        const level = await prisma.level.update({ where: { id }, data });
        await this.invalidateCache(id, level.languageId);
        syncAllUsersProgression({ levelId: id, languageId: level.languageId }, 'update').catch(() => {});
        return level;
    }

    async deleteLevel(id) {
        const modules = await prisma.module.findFirst({ where: { levelId: id }, select: { id: true } });
        if (modules) throw new Error('Impossible de supprimer un niveau qui contient des modules');

        const level = await prisma.level.delete({ where: { id } });
        await this.invalidateCache(id, level.languageId);
        syncAllUsersProgression({ levelId: id, languageId: level.languageId }, 'delete').catch(() => {});
        return level;
    }

    // Progression utilisateur pour Level (optimisée) — aucun blocage, accès libre
    async selectLevelForUser(userId, levelId) {
        const level = await prisma.level.findUnique({
            where: { id: levelId, isActive: true },
            select: { id: true, languageId: true }
        });

        if (!level) {
            throw new Error('Niveau introuvable ou inactif');
        }

        // Remettre lastAccessedAt à null sur tous les autres niveaux de la même langue
        // pour que ce niveau soit clairement le seul "actif" dans my-progress
        await prisma.userLevelProgress.updateMany({
            where: {
                userId,
                levelId: { not: levelId },
                level: { languageId: level.languageId }
            },
            data: { lastAccessedAt: null }
        });

        await prisma.userLevelProgress.upsert({
            where: { userId_levelId: { userId, levelId } },
            update: { lastAccessedAt: new Date() },
            create: { userId, levelId, lastAccessedAt: new Date() }
        });

        await this.invalidateCache(null, level.languageId);
        await cacheDel(`user:${userId}:progress`, `user-levels:${userId}`);
        return prisma.userLevelProgress.findUnique({
            where: { userId_levelId: { userId, levelId } }
        });
    }

    async startLevelForUser(userId, levelId) {
        try {
            return await prisma.userLevelProgress.update({
                where: { userId_levelId: { userId, levelId } },
                data: { startedAt: new Date(), lastAccessedAt: new Date() }
            });
        } catch (err) {
            if (err.code === 'P2025') throw new Error('Niveau non sélectionné pour cet utilisateur');
            throw err;
        }
    }

    async completeLevelForUser(userId, levelId) {
        const levelData = await prisma.level.findUnique({ where: { id: levelId }, select: { languageId: true } });
        const result = await prisma.userLevelProgress.update({
            where: { userId_levelId: { userId, levelId } },
            data: { completedAt: new Date(), progressPercentage: 100 }
        });
        await this.invalidateCache(levelId, levelData?.languageId);
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