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

    // Récupérer un utilisateur par ID avec langue actuelle et progression
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
        }

        return {
            user,
            currentLanguage,
            currentLanguageProgress
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
            currentLanguageProgress
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
        if (data.subscriptionPlan !== undefined) updateData.subscriptionPlan = data.subscriptionPlan;
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
                subscriptionPlan: true,
                subscriptionEndsAt: true,
                updatedAt: true
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
                    COUNT(CASE WHEN "accountType" = 'admin' THEN 1 END) as admin_users,
                    COUNT(CASE WHEN "accountType" = 'parent' THEN 1 END) as parent_users,
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
}

const userService = new UserService();
module.exports = { userService };
