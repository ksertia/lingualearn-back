const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

class UserService {
    // Récupérer tous les utilisateurs (la gestion des rôles est déléguée à la route/controller)
    async getAllUsers(filters = {}) {
        const { page = 1, limit = 20, userType, isActive, isVerified, firstLogin, search } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (userType) {
            where.accountType = userType;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (isVerified !== undefined) {
            where.isVerified = isVerified;
        }
        if (firstLogin !== undefined) {
            where.firstLogin = firstLogin;
        }
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    accountType: true,
                    parentId: true,
                    isVerified: true,
                    isActive: true,
                    firstLogin: true,
                    lastLogin: true,
                    lastActive: true,
                    subscriptionId: true,
                    subscriptionEndsAt: true,
                    createdBy: true,
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
                            createdAt: true,
                            updatedAt: true
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
                    },
                    parentUser: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            accountType: true
                        }
                    },
                    subAccounts: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            accountType: true,
                            isActive: true
                        }
                    },
                    _count: {
                        select: {
                            subAccounts: true,
                            badges: true,
                            certificates: true,
                            notifications: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);
        return {
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    
    // Récupérer un utilisateur par ID
    async getUserById(id) {
        const user = await prisma.user.findUnique({
            where: { id },
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
                parent: {
                    select: {
                        id: true,
                        email: true,
                        username: true
                    }
                },
                children: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        accountType: true
                    }
                }
            }
        });
        
        if (!user) {
            throw new AppError(404, 'User not found');
        }
        
        return user;
    }

    // Récupérer un utilisateur par ID avec toutes ses langues d'apprentissage et progression complète
    async getUserDetailsById(userId) {
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

        // Récupérer TOUTES les progressions de langues de l'utilisateur
        const userLanguageProgressList = await prisma.userLanguageProgress.findMany({
            where: { userId },
            include: { 
                language: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        // flagUrl: true,
                        isActive: true
                    }
                }
            },
            orderBy: [
                { lastAccessedAt: 'desc' },
                { startedAt: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        // Récupérer les IDs de toutes les langues en cours d'apprentissage
        const languageIds = userLanguageProgressList.map(progress => progress.languageId);

        // Récupérer la structure complète de toutes les langues avec progression
        const learningLanguages = await Promise.all(
            languageIds.map(async (languageId) => {
                const languageData = await prisma.language.findUnique({
                    where: { id: languageId },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        // flagUrl: true,
                        isActive: true,
                        levels: {
                            where: { isActive: true },
                            orderBy: { index: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                index: true,
                                isActive: true,
                                userProgress: {
                                    where: { userId },
                                    select: {
                                        id: true,
                                        status: true,
                                        progressPercentage: true,
                                        totalXp: true,
                                        timeSpentMinutes: true,
                                        unlockedAt: true,
                                        startedAt: true,
                                        completedAt: true
                                    }
                                },
                                modules: {
                                    where: { isActive: true },
                                    orderBy: { index: 'asc' },
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        index: true,
                                        thumbnailUrl: true,
                                        isActive: true,
                                        userProgress: {
                                            where: { userId },
                                            select: {
                                                id: true,
                                                status: true,
                                                progressPercentage: true,
                                                totalXp: true,
                                                timeSpentMinutes: true,
                                                unlockedAt: true,
                                                startedAt: true,
                                                completedAt: true
                                            }
                                        },
                                        paths: {
                                            where: { isActive: true },
                                            orderBy: { index: 'asc' },
                                            select: {
                                                id: true,
                                                title: true,
                                                description: true,
                                                index: true,
                                                thumbnailUrl: true,
                                                difficulty: true,
                                                estimatedHours: true,
                                                isActive: true,
                                                userProgress: {
                                                    where: { userId },
                                                    select: {
                                                        id: true,
                                                        status: true,
                                                        progressPercentage: true,
                                                        totalXp: true,
                                                        timeSpentMinutes: true,
                                                        quizScore: true,
                                                        unlockedAt: true,
                                                        startedAt: true,
                                                        completedAt: true
                                                    }
                                                },
                                                steps: {
                                                    where: { isActive: true },
                                                    orderBy: { index: 'asc' },
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        description: true,
                                                        index: true,
                                                        type: true,
                                                        isActive: true,
                                                        userProgress: {
                                                            where: { userId },
                                                            select: {
                                                                id: true,
                                                                status: true,
                                                                progressPercentage: true,
                                                                totalXp: true,
                                                                timeSpentMinutes: true,
                                                                unlockedAt: true,
                                                                startedAt: true,
                                                                completedAt: true
                                                            }
                                                        },
                                                        courses: {
                                                            where: { isActive: true },
                                                            orderBy: { order: 'asc' },
                                                            select: {
                                                                id: true,
                                                                title: true,
                                                                content: true,
                                                                order: true,
                                                                duration: true,
                                                                isActive: true,
                                                                userProgress: {
                                                                    where: { userId },
                                                                    select: {
                                                                        id: true,
                                                                        status: true,
                                                                        completedAt: true,
                                                                        timeSpent: true
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        exercises: {
                                                            where: { isActive: true },
                                                            orderBy: { order: 'asc' },
                                                            select: {
                                                                id: true,
                                                                title: true,
                                                                instructions: true,
                                                                type: true,
                                                                order: true,
                                                                difficulty: true,
                                                                isActive: true,
                                                                userProgress: {
                                                                    where: { userId },
                                                                    select: {
                                                                        id: true,
                                                                        status: true,
                                                                        score: true,
                                                                        attempts: true,
                                                                        completedAt: true,
                                                                        timeSpent: true
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        quizzes: {
                                                            where: { isActive: true },
                                                            orderBy: { order: 'asc' },
                                                            select: {
                                                                id: true,
                                                                title: true,
                                                                description: true,
                                                                order: true,
                                                                passingScore: true,
                                                                timeLimit: true,
                                                                isActive: true,
                                                                userProgress: {
                                                                    where: { userId },
                                                                    select: {
                                                                        id: true,
                                                                        status: true,
                                                                        score: true,
                                                                        attempts: true,
                                                                        bestScore: true,
                                                                        completedAt: true,
                                                                        timeSpent: true
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                // Trouver la progression de cette langue
                const languageProgress = userLanguageProgressList.find(p => p.languageId === languageId);

                // Calculer l'état actuel pour cette langue
                const currentState = this.calculateCurrentState(languageData, userId);

                return {
                    ...languageData,
                    userProgress: {
                        id: languageProgress?.id,
                        status: languageProgress?.status || 'not_started',
                        overallProgress: languageProgress?.overallProgress || 0,
                        totalXp: languageProgress?.totalXp || 0,
                        totalTimeMinutes: languageProgress?.totalTimeMinutes || 0,
                        startedAt: languageProgress?.startedAt,
                        completedAt: languageProgress?.completedAt,
                        lastAccessedAt: languageProgress?.lastAccessedAt
                    },
                    currentState
                };
            })
        );

        // Identifier la langue actuellement active (dernière accédée)
        const currentLanguageId = userLanguageProgressList[0]?.languageId || null;

        return {
            user,
            learningLanguages,
            currentLanguageId,
            totalLanguages: learningLanguages.length
        };
    }

    // Récupérer le profil complet de l'utilisateur connecté avec la langue actuelle et la progression
    async getCurrentUserDetails(userId) {
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

        const progressList = await prisma.userLanguageProgress.findMany({
            where: { userId },
            orderBy: [
                { lastAccessedAt: 'desc' },
                { startedAt: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 1,
            include: { language: true }
        });

        let currentLanguageProgress = progressList[0] || null;

        if (!currentLanguageProgress && user.profile?.preferredLanguage) {
            const language = await prisma.language.findUnique({
                where: { code: user.profile.preferredLanguage }
            });
            if (language) {
                currentLanguageProgress = {
                    id: null,
                    userId,
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

        let currentLanguage = null;
        let currentState = null;

        if (currentLanguageProgress?.languageId) {
            currentLanguage = await prisma.language.findUnique({
                where: { id: currentLanguageProgress.languageId },
                include: {
                    levels: {
                        orderBy: { index: 'asc' },
                        include: {
                            userProgress: {
                                where: { userId }
                            },
                            modules: {
                                orderBy: { index: 'asc' },
                                include: {
                                    userProgress: {
                                        where: { userId }
                                    },
                                    paths: {
                                        orderBy: { index: 'asc' },
                                        include: {
                                            userProgress: {
                                                where: { userId }
                                            },
                                            steps: {
                                                orderBy: { index: 'asc' },
                                                include: {
                                                    userProgress: {
                                                        where: { userId }
                                                    },
                                                    courses: {
                                                        orderBy: { order: 'asc' },
                                                        include: {
                                                            userProgress: {
                                                                where: { userId }
                                                            }
                                                        }
                                                    },
                                                    exercises: {
                                                        orderBy: { order: 'asc' },
                                                        include: {
                                                            userProgress: {
                                                                where: { userId }
                                                            }
                                                        }
                                                    },
                                                    quizzes: {
                                                        orderBy: { order: 'asc' },
                                                        include: {
                                                            userProgress: {
                                                                where: { userId }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Calculer l'état actuel de progression
            currentState = this.calculateCurrentState(currentLanguage, userId);

            if (currentLanguageProgress.id) {
                await prisma.userLanguageProgress.update({
                    where: { id: currentLanguageProgress.id },
                    data: { lastAccessedAt: new Date() }
                });
            }
        }

        return {
            user,
            currentLanguage,
            currentLanguageProgress,
            currentState
        };
    }
    
    // Mettre à jour un utilisateur
    async updateUser(id, data) {
        // Vérifier si l'utilisateur existe
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            throw new AppError(404, 'User not found');
        }
        const updateData = {};
        // Champs que l'utilisateur peut modifier
        if (data.username !== undefined) {
            // Vérifier si le username est unique
            if (data.username !== existingUser.username) {
                const usernameExists = await prisma.user.findUnique({ where: { username: data.username } });
                if (usernameExists) {
                    throw new AppError(400, 'Username already taken');
                }
                updateData.username = data.username;
            }
        }
        // Champs administratifs (à gérer côté route/controller)
        if (data.accountType !== undefined) updateData.accountType = data.accountType;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
        if (data.firstLogin !== undefined) updateData.firstLogin = data.firstLogin;
        // if (data.subscriptionPlan !== undefined) updateData.subscriptionPlan = data.subscriptionPlan;
        if (data.subscriptionEndsAt !== undefined) updateData.subscriptionEndsAt = data.subscriptionEndsAt;
        // Mettre à jour l'utilisateur
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
                // subscriptionPlan: true,
                subscriptionEndsAt: true,
                // updatedAt: true
            }
        });
        return updatedUser;
    }
    
    // Supprimer un utilisateur (soft delete, la gestion des rôles est déléguée à la route/controller)
    async deleteUser(id) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new AppError(404, 'User not found');
        }
        // Soft delete: changer le statut
        await prisma.user.update({ where: { id }, data: { isActive: false } });
        // Invalider toutes les sessions
        await prisma.session.deleteMany({ where: { userId: id } });
        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({ where: { userId: id } });
        return { success: true, message: 'User deleted successfully' };
    }
    
    // Récupérer les statistiques des utilisateurs
    async getUserStats() {
        const stats = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_users,
                COUNT(CASE WHEN "accountType" = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN "accountType" = 'learner' THEN 1 END) as learner_users,
                COUNT(CASE WHEN "accountType" = 'child' THEN 1 END) as child_users,
                COUNT(CASE WHEN "accountType" = 'teacher' THEN 1 END) as teacher_users,
                DATE("createdAt") as date,
                COUNT(*) as daily_signups
            FROM users
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE("createdAt")
            ORDER BY date DESC
        `;
        
        const loginStats = await prisma.loginAttempt.groupBy({
            by: ['success'],
            _count: true,
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
                }
            }
        });
        
        return {
            stats,
            loginStats
        };
    }

    /**
     * Calcule l'état actuel de progression de l'utilisateur
     * Retourne le niveau, module, parcours, étape, course, exercise et quiz actuels
     */
    calculateCurrentState(languageData, userId) {
        if (!languageData || !languageData.levels) {
            return null;
        }

        let currentLevel = null;
        let currentModule = null;
        let currentPath = null;
        let currentStep = null;
        let currentCourse = null;
        let currentExercise = null;
        let currentQuiz = null;

        // Trouver le niveau actuel (premier non complété ou dernier débloqué)
        for (const level of languageData.levels) {
            const progress = level.userProgress?.[0];
            if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                currentLevel = { ...level, currentProgress: progress };
                break;
            }
        }

        if (!currentLevel && languageData.levels.length > 0) {
            currentLevel = languageData.levels[0];
        }

        // Trouver le module actuel
        if (currentLevel?.modules) {
            for (const module of currentLevel.modules) {
                const progress = module.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentModule = { ...module, currentProgress: progress };
                    break;
                }
            }
            if (!currentModule && currentLevel.modules.length > 0) {
                currentModule = currentLevel.modules[0];
            }
        }

        // Trouver le parcours actuel
        if (currentModule?.paths) {
            for (const path of currentModule.paths) {
                const progress = path.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentPath = { ...path, currentProgress: progress };
                    break;
                }
            }
            if (!currentPath && currentModule.paths.length > 0) {
                currentPath = currentModule.paths[0];
            }
        }

        // Trouver l'étape actuelle
        if (currentPath?.steps) {
            for (const step of currentPath.steps) {
                const progress = step.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentStep = { ...step, currentProgress: progress };
                    break;
                }
            }
            if (!currentStep && currentPath.steps.length > 0) {
                currentStep = currentPath.steps[0];
            }
        }

        // Trouver le course actuel
        if (currentStep?.courses) {
            for (const course of currentStep.courses) {
                const progress = course.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentCourse = { ...course, currentProgress: progress };
                    break;
                }
            }
            if (!currentCourse && currentStep.courses.length > 0) {
                currentCourse = currentStep.courses[0];
            }
        }

        // Trouver l'exercise actuel
        if (currentStep?.exercises) {
            for (const exercise of currentStep.exercises) {
                const progress = exercise.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentExercise = { ...exercise, currentProgress: progress };
                    break;
                }
            }
            if (!currentExercise && currentStep.exercises.length > 0) {
                currentExercise = currentStep.exercises[0];
            }
        }

        // Trouver le quiz actuel
        if (currentStep?.quizzes) {
            for (const quiz of currentStep.quizzes) {
                const progress = quiz.userProgress?.[0];
                if (progress && (progress.status === 'started' || progress.status === 'unlocked')) {
                    currentQuiz = { ...quiz, currentProgress: progress };
                    break;
                }
            }
            if (!currentQuiz && currentStep.quizzes.length > 0) {
                currentQuiz = currentStep.quizzes[0];
            }
        }

        return {
            currentLevel: currentLevel ? {
                id: currentLevel.id,
                name: currentLevel.name,
                index: currentLevel.index,
                status: currentLevel.currentProgress?.status || 'locked'
            } : null,
            currentModule: currentModule ? {
                id: currentModule.id,
                name: currentModule.name,
                index: currentModule.index,
                status: currentModule.currentProgress?.status || 'locked'
            } : null,
            currentPath: currentPath ? {
                id: currentPath.id,
                title: currentPath.title,
                index: currentPath.index,
                status: currentPath.currentProgress?.status || 'locked'
            } : null,
            currentStep: currentStep ? {
                id: currentStep.id,
                name: currentStep.name,
                index: currentStep.index,
                type: currentStep.type,
                status: currentStep.currentProgress?.status || 'locked'
            } : null,
            currentCourse: currentCourse ? {
                id: currentCourse.id,
                title: currentCourse.title,
                order: currentCourse.order,
                status: currentCourse.currentProgress?.status || 'locked'
            } : null,
            currentExercise: currentExercise ? {
                id: currentExercise.id,
                title: currentExercise.title,
                type: currentExercise.type,
                order: currentExercise.order,
                status: currentExercise.currentProgress?.status || 'locked'
            } : null,
            currentQuiz: currentQuiz ? {
                id: currentQuiz.id,
                title: currentQuiz.title,
                order: currentQuiz.order,
                status: currentQuiz.currentProgress?.status || 'locked',
                lastScore: currentQuiz.currentProgress?.score || null
            } : null
        };
    }
}

const userService = new UserService();
module.exports = { userService };