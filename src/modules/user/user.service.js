const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { cacheWrap, cacheDel, cacheGet, cacheSet, TTL } = require('../../utils/cache');

// Sélecteurs réutilisables
const PROFILE_SELECT = { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, timezone: true, preferredLanguage: true, birthDate: true };
const STATS_SELECT   = { totalXp: true, totalCoins: true, currentStreak: true, longestStreak: true, totalStudyMinutes: true, totalExercisesCompleted: true, totalLessonsCompleted: true, totalStepsCompleted: true, totalLevelsCompleted: true, totalCertificatesEarned: true, totalBadgesEarned: true, accuracyRate: true };
const SUB_SELECT     = { id: true, status: true, billingCycle: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, plan: { select: { planCode: true, planName: true, priceMonthly: true, priceYearly: true, currency: true } } };
const USER_BASE      = { id: true, email: true, phone: true, username: true, accountType: true, parentId: true, isVerified: true, isActive: true, firstLogin: true, lastLogin: true, lastActive: true, createdAt: true, subscriptionEndsAt: true };

class UserService {

    // ─── LISTE UTILISATEURS ────────────────────────────────────────────────────
    async getAllUsers(filters = {}) {
        const { page = 1, limit = 20, userType, isActive, isVerified, firstLogin, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = this._buildUserFilters({ userType, isActive, isVerified, firstLogin, search });

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                select: { ...USER_BASE, profile: { select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true } } },
                skip, take,
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.user.count({ where })
        ]);

        return { users, pagination: { page: parseInt(page), limit: take, total, pages: Math.ceil(total / take) } };
    }

    async getUsersByProfileFilters(filters = {}) {
        const { page = 1, limit = 20, accountType, isActive, isVerified, firstLogin, firstName, lastName, displayName, preferredLanguage, timezone, search } = filters;
        const take = Number(limit);
        const skip = (Number(page) - 1) * take;
        const where = this._buildProfileFilters({ accountType, isActive, isVerified, firstLogin, firstName, lastName, displayName, preferredLanguage, timezone, search });

        const [users, total] = await Promise.all([
            prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: { ...USER_BASE, profile: { select: PROFILE_SELECT } } }),
            prisma.user.count({ where })
        ]);

        return { users, pagination: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) } };
    }

    // ─── DÉTAIL UTILISATEUR ────────────────────────────────────────────────────
    async getUserById(id) {
        return cacheWrap(`user:${id}:base`, async () => {
            const user = await prisma.user.findUnique({
                where: { id },
                select: { ...USER_BASE, profile: { select: PROFILE_SELECT }, stats: { select: STATS_SELECT } }
            });
            if (!user) throw new AppError(404, 'User not found');
            return user;
        }, TTL.SHORT);
    }

    async getUserDetailsById(userId) {
        return cacheWrap(`user:${userId}:details`, async () => {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { ...USER_BASE, profile: { select: PROFILE_SELECT }, stats: { select: STATS_SELECT }, subscription: { select: SUB_SELECT } }
            });
            if (!user) throw new AppError(404, 'User not found');

            // Progressions langues + toutes progressions en parallèle (1 requête chacune)
            const [langProgressList, levelProgress, moduleProgress, pathProgress, stepProgress] = await Promise.all([
                prisma.userLanguageProgress.findMany({
                    where: { userId },
                    include: { language: { select: { id: true, code: true, name: true, description: true, isActive: true } } },
                    orderBy: [{ lastAccessedAt: 'desc' }, { startedAt: 'desc' }]
                }),
                prisma.userLevelProgress.findMany({ where: { userId }, select: { levelId: true, status: true, progressPercentage: true, unlockedAt: true, startedAt: true, completedAt: true, lastAccessedAt: true } }),
                prisma.userModuleProgress.findMany({ where: { userId }, select: { moduleId: true, status: true, progressPercentage: true } }),
                prisma.userPathProgress.findMany({ where: { userId }, select: { pathId: true, status: true, progressPercentage: true } }),
                prisma.userStepProgress.findMany({ where: { userId }, select: { stepId: true, status: true, progressPercentage: true, score: true } }),
            ]);

            // Maps pour accès O(1)
            const levelMap   = new Map(levelProgress.map(p => [p.levelId, p]));
            const moduleMap  = new Map(moduleProgress.map(p => [p.moduleId, p]));
            const pathMap    = new Map(pathProgress.map(p => [p.pathId, p]));
            const stepMap    = new Map(stepProgress.map(p => [p.stepId, p]));

            return {
                user,
                langProgressList,
                progressMaps: { levelMap, moduleMap, pathMap, stepMap },
                currentLanguageId: langProgressList[0]?.languageId || null,
                totalLanguages: langProgressList.length
            };
        }, TTL.SHORT);
    }

    // ─── PROFIL COURANT (appelé à chaque ouverture de l'app) ──────────────────
    async getCurrentUserDetails(userId) {
        const cacheKey = `user:${userId}:current`;

        // Toutes les requêtes en parallèle — zéro attente séquentielle
        const [user, langProgress] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    ...USER_BASE,
                    profile: { select: PROFILE_SELECT },
                    subscription: { select: SUB_SELECT },
                    stats: { select: STATS_SELECT }
                }
            }),
            prisma.userLanguageProgress.findFirst({
                where: { userId },
                orderBy: [{ lastAccessedAt: 'desc' }, { startedAt: 'desc' }, { createdAt: 'desc' }],
                take: 1,
                include: { language: { select: { id: true, code: true, name: true, description: true, iconUrl: true, isActive: true } } }
            })
        ]);

        if (!user) throw new AppError(404, 'User not found');

        // Calculer l'état courant si une langue est active
        let currentState = null;
        if (langProgress?.languageId) {
            currentState = await this._getCurrentState(userId, langProgress.languageId);

            // Mise à jour lastAccessedAt en arrière-plan (non bloquant)
            if (langProgress.id) {
                prisma.userLanguageProgress.update({
                    where: { id: langProgress.id },
                    data: { lastAccessedAt: new Date() }
                }).catch(() => {});
            }
        }

        // Mise à jour lastActive en arrière-plan (non bloquant)
        prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } }).catch(() => {});

        const result = {
            user: { ...user, selectedLanguageId: langProgress?.language?.id || null, selectedLevelId: currentState?.currentLevel?.id || null },
            currentLanguage: langProgress?.language || null,
            currentLanguageProgress: langProgress,
            currentState
        };

        // Mettre en cache pour 5 min
        await cacheSet(cacheKey, result, TTL.SHORT);
        return result;
    }

    // ─── ÉTAT COURANT (level/module/path/step actif) ───────────────────────────
    async _getCurrentState(userId, languageId) {
        return cacheWrap(`user:${userId}:state:${languageId}`, async () => {
            // 4 requêtes parallèles au lieu de 4 séquentielles
            const [levelProg, lesson, exercise, quiz] = await Promise.all([
                prisma.userLevelProgress.findFirst({
                    where: { userId, status: { in: ['started', 'unlocked'] }, level: { languageId } },
                    orderBy: { lastAccessedAt: 'desc' },
                    include: { level: { select: { id: true, code: true, name: true, index: true } } }
                }),
                Promise.resolve(null), // placeholders — seront remplis après
                Promise.resolve(null),
                Promise.resolve(null),
            ]);

            if (!levelProg) return null;

            const [moduleProg] = await Promise.all([
                prisma.userModuleProgress.findFirst({
                    where: { userId, status: { in: ['started', 'unlocked'] }, module: { levelId: levelProg.levelId } },
                    orderBy: { lastAccessedAt: 'desc' },
                    include: { module: { select: { id: true, title: true, index: true } } }
                })
            ]);

            const pathProg = moduleProg ? await prisma.userPathProgress.findFirst({
                where: { userId, status: { in: ['started', 'unlocked'] }, path: { moduleId: moduleProg.moduleId } },
                orderBy: { lastAccessedAt: 'desc' },
                include: { path: { select: { id: true, title: true, index: true } } }
            }) : null;

            const stepProg = pathProg ? await prisma.userStepProgress.findFirst({
                where: { userId, status: { notIn: ['completed'] }, step: { pathId: pathProg.pathId } },
                orderBy: { updatedAt: 'desc' },
                include: { step: { select: { id: true, title: true, stepType: true, index: true } } }
            }) : null;

            // Contenu de l'étape en parallèle
            let currentLesson = null, currentExercise = null, currentQuiz = null;
            if (stepProg?.step) {
                [currentLesson, currentExercise, currentQuiz] = await Promise.all([
                    prisma.lesson.findFirst({ where: { stepId: stepProg.step.id }, select: { id: true, title: true, content: true, videoUrl: true } }),
                    prisma.exercise.findFirst({ where: { stepId: stepProg.step.id }, select: { id: true, title: true, instructions: true, points: true, xpReward: true, coinReward: true } }),
                    prisma.quiz.findFirst({ where: { stepId: stepProg.step.id }, select: { id: true, title: true, passingScore: true, timeLimitMinutes: true, xpReward: true, coinReward: true } })
                ]);
            }

            return {
                currentLevel:    levelProg?.level    || null,
                currentModule:   moduleProg?.module  || null,
                currentPath:     pathProg?.path      || null,
                currentStep:     stepProg?.step      || null,
                currentLesson,
                currentExercise,
                currentQuiz
            };
        }, TTL.SHORT);
    }

    // ─── MUTATIONS ─────────────────────────────────────────────────────────────
    async updateUser(id, data) {
        const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
        if (!existingUser) throw new AppError(404, 'User not found');

        const updateData = {};

        if (data.username !== undefined && data.username !== existingUser.username) {
            const taken = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
            if (taken) throw new AppError(400, 'Username already taken');
            updateData.username = data.username;
        }

        ['accountType', 'isActive', 'isVerified', 'firstLogin', 'subscriptionEndsAt'].forEach(f => {
            if (data[f] !== undefined) updateData[f] = data[f];
        });

        if (Object.keys(updateData).length === 0) throw new AppError(400, 'No valid fields to update');

        const updated = await prisma.user.update({
            where: { id }, data: updateData,
            select: { id: true, email: true, phone: true, username: true, accountType: true, isVerified: true, isActive: true, firstLogin: true, subscriptionEndsAt: true }
        });

        await cacheDel(`user:${id}:base`, `user:${id}:details`, `user:${id}:current`);
        return updated;
    }

    async deleteUser(id) {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
        if (!user) throw new AppError(404, 'User not found');

        await prisma.$transaction([
            prisma.user.update({ where: { id }, data: { isActive: false } }),
            prisma.session.deleteMany({ where: { userId: id } }),
            prisma.refreshToken.deleteMany({ where: { userId: id } })
        ]);

        await cacheDel(`user:${id}:base`, `user:${id}:details`, `user:${id}:current`);
        return { success: true, message: 'User deleted successfully' };
    }

    // ─── ENFANTS ───────────────────────────────────────────────────────────────
    async getMyChildren(parentId) {
        return cacheWrap(`user:${parentId}:children`, () =>
            prisma.user.findMany({
                where: { parentId, accountType: 'sub_account_learner' },
                select: { id: true, username: true, email: true, phone: true, isActive: true, isVerified: true, createdAt: true, lastLogin: true, lastActive: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } },
                orderBy: { createdAt: 'asc' }
            }).then(data => ({ success: true, total: data.length, data })),
            TTL.SHORT
        );
    }

    // ─── STATS ADMIN ───────────────────────────────────────────────────────────
    async getUserStats() {
        return cacheWrap('admin:user:stats', async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const [newUsers, verified, active, byType, loginStats] = await Promise.all([
                prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
                prisma.user.count({ where: { isVerified: true } }),
                prisma.user.count({ where: { isActive: true } }),
                prisma.user.groupBy({ by: ['accountType'], _count: true }),
                prisma.loginAttempt.groupBy({ by: ['success'], _count: true, where: { createdAt: { gte: thirtyDaysAgo } } })
            ]);

            const accountTypeStats = {};
            byType.forEach(s => { accountTypeStats[s.accountType] = s._count; });

            return {
                stats: { new_users_30d: newUsers, verified_users: verified, active_users: active, ...accountTypeStats },
                loginStats: loginStats.reduce((acc, curr) => { acc[curr.success ? 'success' : 'failed'] = curr._count; return acc; }, {})
            };
        }, TTL.MEDIUM);
    }

    // ─── HELPERS PRIVÉS ────────────────────────────────────────────────────────
    _buildUserFilters({ userType, isActive, isVerified, firstLogin, search }) {
        const where = {};
        if (userType) where.accountType = userType;
        if (isActive !== undefined) where.isActive = isActive;
        if (isVerified !== undefined) where.isVerified = isVerified;
        if (firstLogin !== undefined) where.firstLogin = firstLogin;
        if (search) where.OR = [{ email: { contains: search } }, { phone: { contains: search } }, { username: { contains: search } }];
        return where;
    }

    _buildProfileFilters(filters) {
        const where = {};
        if (filters.accountType) where.accountType = filters.accountType;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
        if (filters.firstLogin !== undefined) where.firstLogin = filters.firstLogin;

        const profileFilters = {};
        if (filters.firstName) profileFilters.firstName = { contains: filters.firstName };
        if (filters.lastName) profileFilters.lastName = { contains: filters.lastName };
        if (filters.displayName) profileFilters.displayName = { contains: filters.displayName };
        if (filters.preferredLanguage) profileFilters.preferredLanguage = filters.preferredLanguage;
        if (filters.timezone) profileFilters.timezone = filters.timezone;
        if (Object.keys(profileFilters).length > 0) where.profile = { is: profileFilters };

        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { username: { contains: filters.search } },
                { profile: { is: { displayName: { contains: filters.search } } } },
                { profile: { is: { firstName: { contains: filters.search } } } },
            ];
        }
        return where;
    }
}

const userService = new UserService();
module.exports = { userService };
