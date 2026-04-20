const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

class UserService {
    constructor() {
        // Cache pour les requêtes fréquentes
        this.userCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    // Helper pour gérer le cache
    getCachedUser(userId) {
        const cached = this.userCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    setCachedUser(userId, data) {
        this.userCache.set(userId, {
            data,
            timestamp: Date.now()
        });
    }

    invalidateUserCache(userId) {
        this.userCache.delete(userId);
    }

    // Récupérer tous les utilisateurs avec optimisation des requêtes
    async getAllUsers(filters = {}) {
        const { 
            page = 1, 
            limit = 20, 
            userType, 
            isActive, 
            isVerified, 
            firstLogin, 
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = filters;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        
        // Construction conditionnelle du where pour éviter les requêtes inutiles
        const where = this.buildUserFilters({
            userType,
            isActive,
            isVerified,
            firstLogin,
            search
        });

        // Optimisation: Utiliser transaction pour éviter deux requêtes séparées
        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                select: this.getUserSelectFields('list'),
                skip,
                take,
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.user.count({ where })
        ]);

        return {
            users,
            pagination: {
                page: parseInt(page),
                limit: take,
                total,
                pages: Math.ceil(total / take)
            }
        };
    }

    // Optimisation: Sélecteur de champs basé sur le contexte
    getUserSelectFields(context = 'list') {
        const baseFields = {
            id: true,
            email: true,
            phone: true,
            username: true,
            accountType: true,
            isVerified: true,
            isActive: true,
            firstLogin: true,
            createdAt: true
        };

        if (context === 'details') {
            return {
                ...baseFields,
                parentId: true,
                lastLogin: true,
                lastActive: true,
                subscriptionId: true,
                subscriptionEndsAt: true,
                createdBy: true,
                profile: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        birthDate: true,
                        avatarUrl: true,
                        timezone: true,
                        preferredLanguage: true
                    }
                },
                stats: {
                    select: {
                        totalXp: true,
                        totalCoins: true,
                        currentStreak: true,
                        totalStudyMinutes: true,
                        accuracyRate: true
                    }
                }
            };
        }

        // Ajouter le profil même pour la liste pour éviter les erreurs frontend
        return {
            ...baseFields,
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatarUrl: true
                }
            }
        };
    }

    // Helper pour construire les filtres
    buildUserFilters(filters) {
        const where = {};
        const { userType, isActive, isVerified, firstLogin, search } = filters;

        if (userType) where.accountType = userType;
        if (isActive !== undefined) where.isActive = isActive;
        if (isVerified !== undefined) where.isVerified = isVerified;
        if (firstLogin !== undefined) where.firstLogin = firstLogin;
        
        if (search) {
            where.OR = [
                { email: { contains: search } },
                { phone: { contains: search } },
                { username: { contains: search } }
            ];
        }

        return where;
    }

    // Version optimisée avec pagination et indexation
    async getUsersByProfileFilters(filters = {}) {
        const {
            page = 1,
            limit = 20,
            accountType,
            isActive,
            isVerified,
            firstLogin,
            firstName,
            lastName,
            displayName,
            preferredLanguage,
            timezone,
            search,
        } = filters;

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;
        
        // Construction conditionnelle des filtres
        const where = this.buildProfileFilters({
            accountType,
            isActive,
            isVerified,
            firstLogin,
            firstName,
            lastName,
            displayName,
            preferredLanguage,
            timezone,
            search
        });

        // Utiliser une seule requête avec include au lieu de deux requêtes séparées
        const result = await prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                accountType: true,
                isActive: true,
                isVerified: true,
                firstLogin: true,
                createdAt: true,
                profile: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        birthDate: true,
                        avatarUrl: true,
                        timezone: true,
                        preferredLanguage: true,
                    },
                },
            }
        });

        // Compter le total avec une requête optimisée
        const total = await prisma.user.count({ where });

        return {
            users: result,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                pages: Math.ceil(total / take),
            },
        };
    }

    buildProfileFilters(filters) {
        const where = {};
        
        // Filtres User
        if (filters.accountType) where.accountType = filters.accountType;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
        if (filters.firstLogin !== undefined) where.firstLogin = filters.firstLogin;

        // Filtres Profile avec optimisation
        const profileFilters = {};
        if (filters.firstName) profileFilters.firstName = { contains: filters.firstName };
        if (filters.lastName) profileFilters.lastName = { contains: filters.lastName };
        if (filters.displayName) profileFilters.displayName = { contains: filters.displayName };
        if (filters.preferredLanguage) profileFilters.preferredLanguage = filters.preferredLanguage;
        if (filters.timezone) profileFilters.timezone = filters.timezone;

        if (Object.keys(profileFilters).length > 0) {
            where.profile = { is: profileFilters };
        }

        // Search global optimisé
        if (filters.search) {
            const searchConditions = [
                { email: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { username: { contains: filters.search } }
            ];

            // Ajouter conditions profile seulement si nécessaire
            if (where.profile?.is) {
                const profileConditions = ['displayName', 'firstName', 'lastName'];
                profileConditions.forEach(field => {
                    searchConditions.push({
                        profile: { is: { [field]: { contains: filters.search } } }
                    });
                });
            }

            where.OR = searchConditions;
        }

        return where;
    }

    // Récupérer un utilisateur par ID avec cache
    async getUserById(id) {
        // Vérifier le cache
        const cachedUser = this.getCachedUser(id);
        if (cachedUser) return cachedUser;

        const user = await prisma.user.findUnique({
            where: { id },
            select: this.getUserSelectFields('details')
        });
        
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Mettre en cache
        this.setCachedUser(id, user);
        return user;
    }

    // Version optimisée de getUserDetailsById avec chargement lazy
    async getUserDetailsById(userId) {
        // Vérifier le cache
        const cachedUser = this.getCachedUser(userId);
        if (cachedUser?.details) return cachedUser.details;

        // Requête principale optimisée
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: this.getUserSelectFields('details')
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Charger les progressions de langues en parallèle avec les autres données
        const [userLanguageProgressList, subscriptionData] = await Promise.all([
            prisma.userLanguageProgress.findMany({
                where: { userId },
                include: { 
                    language: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            description: true,
                            isActive: true
                        }
                    }
                },
                orderBy: [
                    { lastAccessedAt: 'desc' },
                    { startedAt: 'desc' }
                ]
            }),
            user.subscriptionId ? prisma.subscription.findUnique({
                where: { id: user.subscriptionId },
                include: {
                    plan: true
                }
            }) : Promise.resolve(null)
        ]);

        // Charger les données de progression uniquement si nécessaire
        const learningLanguages = userLanguageProgressList.length > 0 
            ? await this.loadLearningLanguages(userLanguageProgressList, userId)
            : [];

        const result = {
            user: { ...user, subscription: subscriptionData },
            learningLanguages,
            currentLanguageId: userLanguageProgressList[0]?.languageId || null,
            totalLanguages: learningLanguages.length
        };

        // Mettre en cache
        this.setCachedUser(userId, { ...result, details: true });
        
        return result;
    }

    // Charger les langues d'apprentissage avec progression optimisée
    async loadLearningLanguages(userLanguageProgressList, userId) {
        const languageIds = userLanguageProgressList.map(p => p.languageId);
        
        // Charger toutes les langues en une seule requête
        const languages = await prisma.language.findMany({
            where: { id: { in: languageIds } },
            include: {
                levels: {
                    where: { isActive: true },
                    orderBy: { index: 'asc' },
                    include: {
                        modules: {
                            where: { isActive: true },
                            orderBy: { index: 'asc' },
                            include: {
                                paths: {
                                    where: { isActive: true },
                                    orderBy: { index: 'asc' },
                                    include: {
                                        steps: {
                                            where: { isActive: true },
                                            orderBy: { index: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Charger toutes les progressions en une seule requête
        const allProgress = await prisma.$transaction([
            prisma.userLevelProgress.findMany({ where: { userId } }),
            prisma.userModuleProgress.findMany({ where: { userId } }),
            prisma.userPathProgress.findMany({ where: { userId } }),
            prisma.userStepProgress.findMany({ where: { userId } }),
            prisma.userCourseProgress.findMany({ where: { userId } }),
            prisma.userExerciseProgress.findMany({ where: { userId } }),
            prisma.userQuizProgress.findMany({ where: { userId } })
        ]);

        const [levelProgress, moduleProgress, pathProgress, stepProgress, courseProgress, exerciseProgress, quizProgress] = allProgress;

        // Mapper les progressions pour un accès rapide
        const progressMaps = {
            levels: new Map(levelProgress.map(p => [`${p.levelId}`, p])),
            modules: new Map(moduleProgress.map(p => [`${p.moduleId}`, p])),
            paths: new Map(pathProgress.map(p => [`${p.pathId}`, p])),
            steps: new Map(stepProgress.map(p => [`${p.stepId}`, p])),
            courses: new Map(courseProgress.map(p => [`${p.courseId}`, p])),
            exercises: new Map(exerciseProgress.map(p => [`${p.exerciseId}`, p])),
            quizzes: new Map(quizProgress.map(p => [`${p.quizId}`, p]))
        };

        // Construire la structure complète avec progressions
        return languages.map(language => {
            const languageProgress = userLanguageProgressList.find(p => p.languageId === language.id);
            
            // Ajouter les progressions à chaque niveau
            const levelsWithProgress = language.levels.map(level => ({
                ...level,
                userProgress: [progressMaps.levels.get(`${level.id}`)].filter(Boolean),
                modules: level.modules.map(module => ({
                    ...module,
                    userProgress: [progressMaps.modules.get(`${module.id}`)].filter(Boolean),
                    paths: module.paths.map(path => ({
                        ...path,
                        userProgress: [progressMaps.paths.get(`${path.id}`)].filter(Boolean),
                        steps: path.steps.map(step => ({
                            ...step,
                            userProgress: [progressMaps.steps.get(`${step.id}`)].filter(Boolean),
                            courses: step.courses?.map(course => ({
                                ...course,
                                userProgress: [progressMaps.courses.get(`${course.id}`)].filter(Boolean)
                            })) || [],
                            exercises: step.exercises?.map(exercise => ({
                                ...exercise,
                                userProgress: [progressMaps.exercises.get(`${exercise.id}`)].filter(Boolean)
                            })) || [],
                            quizzes: step.quizzes?.map(quiz => ({
                                ...quiz,
                                userProgress: [progressMaps.quizzes.get(`${quiz.id}`)].filter(Boolean)
                            })) || []
                        }))
                    }))
                }))
            }));

            return {
                ...language,
                levels: levelsWithProgress,
                userProgress: languageProgress,
                currentState: this.calculateCurrentStateOptimized({ ...language, levels: levelsWithProgress }, userId, progressMaps)
            };
        });
    }

    // Version optimisée du calcul d'état courant
    calculateCurrentStateOptimized(languageData, userId, progressMaps = null) {
        if (!languageData?.levels) return null;

        let currentLevel = null;
        let currentModule = null;
        let currentPath = null;
        let currentStep = null;

        // Parcourir la structure pour trouver l'élément actif
        for (const level of languageData.levels) {
            const levelProgress = level.userProgress?.[0];
            if (levelProgress?.status === 'started' || levelProgress?.status === 'unlocked') {
                currentLevel = { ...level, currentProgress: levelProgress };
                
                for (const module of level.modules) {
                    const moduleProgress = module.userProgress?.[0];
                    if (moduleProgress?.status === 'started' || moduleProgress?.status === 'unlocked') {
                        currentModule = { ...module, currentProgress: moduleProgress };
                        
                        for (const path of module.paths) {
                            const pathProgress = path.userProgress?.[0];
                            if (pathProgress?.status === 'started' || pathProgress?.status === 'unlocked') {
                                currentPath = { ...path, currentProgress: pathProgress };
                                
                                for (const step of path.steps) {
                                    const stepProgress = step.userProgress?.[0];
                                    if (stepProgress?.status === 'started' || stepProgress?.status === 'unlocked') {
                                        currentStep = { ...step, currentProgress: stepProgress };
                                        break;
                                    }
                                }
                                if (currentStep) break;
                            }
                        }
                        if (currentPath) break;
                    }
                }
                if (currentModule) break;
            }
        }

        return {
            currentLevel: currentLevel ? this.sanitizeProgress(currentLevel) : null,
            currentModule: currentModule ? this.sanitizeProgress(currentModule) : null,
            currentPath: currentPath ? this.sanitizeProgress(currentPath) : null,
            currentStep: currentStep ? this.sanitizeProgress(currentStep) : null,
            currentLesson: currentStep?.lesson || null,
            currentExercise: currentStep?.exercise || null,
            currentQuiz: currentStep?.quiz || null
        };
    }

    sanitizeProgress(item) {
        const { currentProgress, ...rest } = item;
        return {
            ...rest,
            status: currentProgress?.status || 'blocked',
            progressPercentage: currentProgress?.progressPercentage || 0
        };
    }

    // Mettre à jour un utilisateur avec invalidation de cache
    async updateUser(id, data) {
        const existingUser = await prisma.user.findUnique({ 
            where: { id },
            select: { id: true, username: true }
        });
        
        if (!existingUser) {
            throw new AppError(404, 'User not found');
        }

        const updateData = {};
        
        if (data.username !== undefined && data.username !== existingUser.username) {
            const usernameExists = await prisma.user.findUnique({ 
                where: { username: data.username },
                select: { id: true }
            });
            if (usernameExists) {
                throw new AppError(400, 'Username already taken');
            }
            updateData.username = data.username;
        }

        // Champs autorisés
        const allowedFields = ['accountType', 'isActive', 'isVerified', 'firstLogin', 'subscriptionEndsAt'];
        allowedFields.forEach(field => {
            if (data[field] !== undefined) updateData[field] = data[field];
        });

        if (Object.keys(updateData).length === 0) {
            throw new AppError(400, 'No valid fields to update');
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                accountType: true,
                isVerified: true,
                isActive: true,
                firstLogin: true,
                subscriptionEndsAt: true,
            }
        });

        // Invalider le cache
        this.invalidateUserCache(id);
        
        return updatedUser;
    }

    // Supprimer un utilisateur avec gestion transactionnelle
    async deleteUser(id) {
        const user = await prisma.user.findUnique({ 
            where: { id },
            select: { id: true, isActive: true }
        });
        
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Utiliser une transaction pour toutes les opérations
        await prisma.$transaction([
            prisma.user.update({ 
                where: { id }, 
                data: { isActive: false } 
            }),
            prisma.session.deleteMany({ 
                where: { userId: id } 
            }),
            prisma.refreshToken.deleteMany({ 
                where: { userId: id } 
            })
        ]);

        // Invalider le cache
        this.invalidateUserCache(id);
        
        return { success: true, message: 'User deleted successfully' };
    }

    // Optimisation des stats avec agrégation directe
    async getUserStats() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [stats, loginStats] = await Promise.all([
            prisma.$transaction([
                prisma.user.aggregate({
                    _count: { id: true },
                    where: { createdAt: { gte: thirtyDaysAgo } }
                }),
                prisma.user.count({ where: { isVerified: true } }),
                prisma.user.count({ where: { isActive: true } }),
                prisma.user.groupBy({
                    by: ['accountType'],
                    _count: true
                }),
                prisma.$queryRaw`
                    SELECT 
                        DATE("createdAt") as date,
                        COUNT(*) as daily_signups
                    FROM users
                    WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY DATE("createdAt")
                    ORDER BY date DESC
                `
            ]),
            prisma.loginAttempt.groupBy({
                by: ['success'],
                _count: true,
                where: {
                    createdAt: { gte: thirtyDaysAgo }
                }
            })
        ]);

        const accountTypeStats = {};
        stats[3].forEach(stat => {
            accountTypeStats[stat.accountType] = stat._count;
        });

        return {
            stats: {
                total_users: stats[0]._count.id,
                verified_users: stats[1],
                active_users: stats[2],
                ...accountTypeStats,
                daily_signups: stats[4]
            },
            loginStats: loginStats.reduce((acc, curr) => {
                acc[curr.success ? 'success' : 'failed'] = curr._count;
                return acc;
            }, {})
        };
    }

    async getCurrentUserDetails(userId) {
        // Invalider le cache pour forcer la régénération avec les nouveaux champs
        this.invalidateUserCache(`current:${userId}`);


        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                accountType: true,
                parentId: true,
                isVerified: true,
                subscriptionEndsAt: true,
                isActive: true,
                firstLogin: true,
                lastLogin: true,
                lastActive: true,
                createdAt: true,
                profile: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        birthDate: true,
                        avatarUrl: true,
                        timezone: true,
                        preferredLanguage: true
                    }
                },
                subscription: {
                    select: {
                        id: true,
                        status: true,
                        billingCycle: true,
                        currentPeriodStart: true,
                        currentPeriodEnd: true,
                        cancelAtPeriodEnd: true,
                        plan: {
                            select: {
                                planCode: true,
                                planName: true,
                                priceMonthly: true,
                                priceYearly: true,
                                currency: true
                            }
                        }
                    }
                },
                stats: {
                    select: {
                        totalXp: true,
                        totalCoins: true,
                        currentStreak: true,
                        longestStreak: true,
                        totalStudyMinutes: true,
                        totalExercisesCompleted: true,
                        totalLessonsCompleted: true,
                        totalStepsCompleted: true,
                        totalLevelsCompleted: true,
                        totalCertificatesEarned: true,
                        totalBadgesEarned: true,
                        accuracyRate: true
                    }
                }
            }
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Récupérer la progression de langue actuelle de manière optimisée
        const progressList = await prisma.userLanguageProgress.findMany({
            where: { userId },
            orderBy: [
                { lastAccessedAt: 'desc' },
                { startedAt: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 1,
            include: { 
                language: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        iconUrl: true,
                        isActive: true
                    }
                }
            }
        });

        let currentLanguageProgress = progressList[0] || null;

        // Si aucune progression et langue préférée définie, créer une progression par défaut
        if (!currentLanguageProgress && user.profile?.preferredLanguage) {
            const language = await prisma.language.findUnique({
                where: { code: user.profile.preferredLanguage },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    // deonUrl: true,
                    isActive: true
                }
            });
            if (language) {
                currentLanguageProgress = {
                    id: null,
                    usscription: true,
                    icerId,
                    languageId: language.id,
                    status: 'not_started',
                    overallProgress: null,
                    totalXp: 0,
                    totalTimeMinutes: 0,
                    startedAt: null,
                    completedAt: null,
                    lastAccessedAt: null,
                    createdAt: null,
                    updatedAt: null,
                    language
                };
            }
        }

        let currentLanguage = currentLanguageProgress?.language || null;
        let currentState = null;

        if (currentLanguageProgress?.languageId) {
            // Calculer l'état actuel de manière optimisée (requêtes ciblées)
            currentState = await this.calculateCurrentStateOptimizedForUser(userId, currentLanguageProgress.languageId);

            // Mettre à jour lastAccessedAt si progression existe
            if (currentLanguageProgress.id) {
                await prisma.userLanguageProgress.update({
                    where: { id: currentLanguageProgress.id },
                    data: { lastAccessedAt: new Date() }
                });
            }
        }

        // Enrichir l'objet user avec les IDs nécessaires pour la redirection Flutter
        const enrichedUser = {
            ...user,
            selectedLanguageId: currentLanguage?.id || null,
            selectedLevelId: currentState?.currentLevel?.id || null
        };

        const result = {
            user: enrichedUser,
            currentLanguage,
            currentLanguageProgress,
            currentState
        };

        // Mettre en cache
        this.setCachedUser(`current:${userId}`, result);
        
        return result;
    }

    // Méthode optimisée pour calculer l'état actuel sans includes profonds (version pour getCurrentUserDetails)
    async calculateCurrentStateOptimizedForUser(userId, languageId) {
        // Récupérer le niveau actuel (1 requête optimisée)
        const currentLevel = await prisma.userLevelProgress.findFirst({
            where: { 
                userId,
                level: { languageId }
            },
            orderBy: { lastAccessedAt: 'desc' },
            include: {
                level: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        index: true
                    }
                }
            }
        });

        if (!currentLevel) return null;

        // Récupérer le module actuel (1 requête optimisée)
        const currentModule = await prisma.userModuleProgress.findFirst({
            where: { 
                userId,
                module: { levelId: currentLevel.levelId }
            },
            orderBy: { lastAccessedAt: 'desc' },
            include: {
                module: {
                    select: {
                        id: true,
                        title: true,
                        index: true
                    }
                }
            }
        });

        // Récupérer le parcours actuel (1 requête optimisée)
        const currentPath = currentModule ? await prisma.userPathProgress.findFirst({
            where: { 
                userId,
                path: { moduleId: currentModule.moduleId }
            },
            orderBy: { lastAccessedAt: 'desc' },
            include: {
                path: {
                    select: {
                        id: true,
                        title: true,
                        index: true
                    }
                }
            }
        }) : null;

        // Récupérer l'étape actuelle (1 requête optimisée)
        const currentStep = currentPath ? await prisma.userStepProgress.findFirst({
            where: { 
                userId,
                step: { pathId: currentPath.pathId }
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                step: {
                    select: {
                        id: true,
                        title: true,
                        stepType: true,
                        index: true
                    }
                }
            }
        }) : null;

        // Récupérer le contenu de l'étape actuelle si elle existe (1 requête conditionnelle)
        let currentLesson = null;
        let currentExercise = null;
        let currentQuiz = null;

        if (currentStep?.step) {
            const [lesson, exercise, quiz] = await Promise.all([
                prisma.lesson.findFirst({
                    where: { stepId: currentStep.step.id },
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        videoUrl: true
                    }
                }),
                prisma.exercise.findFirst({
                    where: { stepId: currentStep.step.id },
                    select: {
                        id: true,
                        title: true,
                        instructions: true,
                        points: true,
                        xpReward: true,
                        coinReward: true
                    }
                }),
                prisma.quiz.findFirst({
                    where: { stepId: currentStep.step.id },
                    select: {
                        id: true,
                        title: true,
                        passingScore: true,
                        timeLimitMinutes: true,
                        xpReward: true,
                        coinReward: true
                    }
                })
            ]);

            currentLesson = lesson;
            currentExercise = exercise;
            currentQuiz = quiz;
        }

        return {
            currentLevel: currentLevel?.level || null,
            currentModule: currentModule?.module || null,
            currentPath: currentPath?.path || null,
            currentStep: currentStep?.step || null,
            currentLesson,
            currentExercise,
            currentQuiz
        };
    }

    // Récupérer les comptes enfants d'un parent
    async getMyChildren(parentId) {
        const children = await prisma.user.findMany({
            where: { parentId, accountType: 'sub_account_learner' },
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                lastLogin: true,
                lastActive: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return { success: true, total: children.length, data: children };
    }

    // Cleanup périodique du cache
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.userCache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.userCache.delete(key);
            }
        }
    }
}

const userService = new UserService();

// Nettoyer le cache toutes les heures
setInterval(() => userService.cleanupCache(), 60 * 60 * 1000);

module.exports = { userService };