const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern, TTL } = require('../../utils/cache');
const { syncAllUsersProgression } = require('../../utils/progressionSync');

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
            const firstModule = await prisma.module.findFirst({
                where: { levelId, isActive: true },
                orderBy: { index: 'asc' },
                select: { id: true }
            });
            if (firstModule) {
                await progressionService.unlockModuleWithChildren(userId, firstModule.id);
            }
        }

        await this.invalidateCache(null, level.languageId);
        await cacheDel(`user-levels:${userId}`);
        return progress;
    }

    // Méthode helper pour débloquer le contenu d'un niveau
    async unlockLevelContent(userId, levelId) {
        // Charger module1 + path1 + step1 en parallèle via leurs relations imbriquées
        const [firstModule, firstPathViaLevel, firstStepViaLevel] = await Promise.all([
            prisma.module.findFirst({
                where: { levelId, isActive: true },
                orderBy: { index: 'asc' },
                select: { id: true }
            }),
            prisma.path.findFirst({
                where: { module: { levelId, isActive: true }, isActive: true },
                orderBy: [{ module: { index: 'asc' } }, { index: 'asc' }],
                select: { id: true, moduleId: true }
            }),
            prisma.step.findFirst({
                where: { path: { module: { levelId, isActive: true }, isActive: true }, isActive: true },
                orderBy: [{ path: { module: { index: 'asc' } } }, { path: { index: 'asc' } }, { index: 'asc' }],
                select: { id: true }
            })
        ]);

        if (!firstModule) return;

        const now = new Date();
        const unlockedData = { status: 'unlocked', unlockedAt: now, lastAccessedAt: now };

        // Construire les upserts disponibles selon ce qu'on a trouvé
        const upserts = [
            prisma.userModuleProgress.upsert({
                where: { userId_moduleId: { userId, moduleId: firstModule.id } },
                update: unlockedData,
                create: { userId, moduleId: firstModule.id, ...unlockedData }
            })
        ];

        if (firstPathViaLevel) {
            upserts.push(prisma.userPathProgress.upsert({
                where: { userId_pathId: { userId, pathId: firstPathViaLevel.id } },
                update: unlockedData,
                create: { userId, pathId: firstPathViaLevel.id, ...unlockedData }
            }));
        }

        if (firstStepViaLevel) {
            upserts.push(prisma.userStepProgress.upsert({
                where: { userId_stepId: { userId, stepId: firstStepViaLevel.id } },
                update: unlockedData,
                create: { userId, stepId: firstStepViaLevel.id, ...unlockedData }
            }));
        }

        await Promise.all(upserts);
    }

    async startLevelForUser(userId, levelId) {
        try {
            return await prisma.userLevelProgress.update({
                where: { userId_levelId: { userId, levelId } },
                data: { status: 'started', startedAt: new Date(), lastAccessedAt: new Date() }
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
            data: { status: 'completed', completedAt: new Date(), progressPercentage: 100 }
        });
        await this.invalidateCache(levelId, levelData?.languageId);
        return result;
    }

    // Compléter un niveau avec déblocage automatique du suivant
    async completeLevelWithAutoUnlock(userId, levelId) {
        const levelData = await prisma.level.findUnique({ where: { id: levelId }, select: { languageId: true } });
        const result = await progressionService.completeLevelAndUnlockNext(userId, levelId);
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