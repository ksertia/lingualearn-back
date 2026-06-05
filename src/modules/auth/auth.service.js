const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../../config/prisma');
const { appConfig } = require('../../config/appConfig');
const { AppError } = require('../../middleware/errorHandler');
const {allowRoles} = require('../../middleware/authMiddleware');
const { emailService } = require('../../utils/emailService');
const { logger } = require('../../utils/logger');
const { cacheGet, cacheSet, cacheDel, TTL } = require('../../utils/cache');
const { createNotification } = require('../notification/notification.service');

// Recherche utilisateur par loginInfo (email / phone / username) — 1 requête
async function findUserByLoginInfo(loginInfo, select) {
    if (loginInfo.includes('@')) return prisma.user.findUnique({ where: { email: loginInfo }, select });
    if (/^\+?\d+$/.test(loginInfo)) return prisma.user.findFirst({ where: { phone: loginInfo }, select });
    return prisma.user.findUnique({ where: { username: loginInfo }, select });
}

class AuthService {
    // ============ INSCRIPTION (publique — learner, admin, teacher, platform_manager) ============
    async register(data) {
        const { email, phone, password, username, accountType, firstName, lastName } = data;

        // sub_account_learner ne peut PAS s'inscrire via la route publique
        if (accountType === 'sub_account_learner') {
            throw new AppError(403, 'Child accounts must be created by the parent. Use POST /api/v1/auth/children');
        }

        const ACCOUNT_TYPE_MAP = {
            admin: 'admin',
            learner: 'learner',
            teacher: 'teacher',
            plateform_manager: 'plateform_manager',
        };
        const finalAccountType = ACCOUNT_TYPE_MAP[accountType];
        if (!finalAccountType) {
            throw new AppError(400, 'Invalid account type');
        }

        if (!email && !phone) {
            throw new AppError(400, 'Either email or phone must be provided');
        }

        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) throw new AppError(400, 'A user already exists with this email');
        }

        if (phone) {
            const existingPhone = await prisma.user.findFirst({ where: { phone } });
            if (existingPhone) throw new AppError(400, 'A user already exists with this phone number');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Créer le user + trial dans une transaction atomique
        // La génération du username est dans la transaction pour éviter les race conditions
        const user = await prisma.$transaction(async (tx) => {
            let finalUsername = username ?? null;

            if (finalAccountType === 'learner') {
                const now = new Date();
                const day   = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year  = now.getFullYear();
                const baseUsername = `EDU-${day}${month}${year}`;
                let uniqueUsername = baseUsername;
                let suffix = 1;
                while (await tx.user.findUnique({ where: { username: uniqueUsername } })) {
                    uniqueUsername = `${baseUsername}-${suffix}`;
                    suffix++;
                }
                finalUsername = uniqueUsername;
            } else if (finalUsername) {
                const existing = await tx.user.findUnique({ where: { username: finalUsername } });
                if (existing) throw new AppError(400, 'Username already taken');
            }

            const created = await tx.user.create({
                data: {
                    email,
                    phone,
                    username: finalUsername,
                    passwordHash,
                    accountType: finalAccountType,
                    profile: { create: { firstName, lastName } }
                },
                include: { profile: true }
            });

            if (finalAccountType === 'learner') {
                await this._createTrialSubscription(created.id, tx);
            }

            return created;
        });

        let trialDays = 14;
        if (finalAccountType === 'learner') {
            try {
                const setting = await prisma.appSetting.findUnique({ where: { key: 'trial_duration_days' } });
                if (setting) trialDays = parseInt(setting.value, 10);
            } catch (_) {}

            // Email de bienvenue
            if (email && user.username) {
                await emailService.sendWelcomeLearnerEmail(email, user.username, trialDays);
            }

            // Notification in-app de bienvenue (non bloquante)
            createNotification({
                userId: user.id,
                notificationType: 'welcome',
                title: 'Bienvenue sur LinguaLearn !',
                message: `Votre essai gratuit de ${trialDays} jours commence maintenant. Bonne découverte !`,
                actionUrl: '/home',
            }).catch(() => {});
        }

        return {
            success: true,
            message: 'User registered successfully',
            username: user.username,
            email: user.email
        };
    }

    // ============ CRÉATION COMPTE ENFANT (réservée au parent connecté) ============
    async addChildAccount(parentId, data) {
        const { password, firstName, lastName, phone, email } = data;

        // Vérifier que le parent existe et est un learner
        const parent = await prisma.user.findUnique({
            where: { id: parentId },
            select: { id: true, accountType: true, phone: true, email: true, profile: { select: { firstName: true, lastName: true } } }
        });

        if (!parent || parent.accountType !== 'learner') {
            throw new AppError(403, 'Only learner accounts can create child accounts');
        }

        // Vérifier unicité email/phone si fournis
        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) throw new AppError(400, 'A user already exists with this email');
        }

        if (phone) {
            const existingPhone = await prisma.user.findFirst({ where: { phone } });
            if (existingPhone) throw new AppError(400, 'A user already exists with this phone number');
        }

        // Génération du username : PRENOM-EDU-001, PRENOM-EDU-002...
        const firstNameClean = firstName
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')  // retire les accents
            .replace(/[^A-Z]/g, '');           // garde uniquement les lettres
        const baseUsername = `${firstNameClean}-EDU`;
        const existingSiblings = await prisma.user.count({
            where: { parentId, accountType: 'sub_account_learner' }
        });
        let orderNum = existingSiblings + 1;
        let uniqueUsername = `${baseUsername}-${String(orderNum).padStart(3, '0')}`;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            orderNum++;
            uniqueUsername = `${baseUsername}-${String(orderNum).padStart(3, '0')}`;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const child = await prisma.user.create({
            data: {
                email: email ?? null,
                phone: phone ?? null,
                username: uniqueUsername,
                passwordHash,
                accountType: 'sub_account_learner',
                parentId,
                createdBy: parentId,
                isVerified: true,
                profile: { create: { firstName, lastName } }
            },
            include: { profile: true }
        });

        // Email de bienvenue à l'enfant (si il a un email)
        if (email) {
            await emailService.sendWelcomeChildEmail(email, uniqueUsername);
        }

        // Email de notification au parent avec les infos du sous-compte
        if (parent.email) {
            const parentName = parent.profile?.firstName || 'Parent';
            await emailService.sendParentChildCreatedEmail(
                parent.email,
                parentName,
                uniqueUsername,
                password,
                firstName
            );
        }

        // Notifications in-app (non bloquantes)
        createNotification({
            userId: child.id,
            notificationType: 'welcome',
            title: 'Bienvenue sur LinguaLearn !',
            message: `Ton compte a été créé. Bonne découverte !`,
            actionUrl: '/home',
        }).catch(() => {});

        createNotification({
            userId: parentId,
            notificationType: 'child_account_created',
            title: 'Compte enfant créé',
            message: `Le compte de ${firstName} (${uniqueUsername}) a été créé avec succès.`,
            actionUrl: '/family',
        }).catch(() => {});

        return {
            success: true,
            message: 'Child account created successfully',
            username: uniqueUsername,
            childId: child.id,
            email: child.email ?? null
        };
    }


    // ============ RÉINITIALISATION MOT DE PASSE ENFANT (par le parent) ============
    async resetChildPassword(parentId, childId, newPassword) {
        // Vérifier que l'enfant appartient bien à ce parent
        const child = await prisma.user.findFirst({
            where: { id: childId, parentId, accountType: 'sub_account_learner' },
            select: { id: true, username: true, email: true }
        });

        if (!child) {
            throw new AppError(404, 'Child account not found or does not belong to you');
        }

        // Récupérer les infos du parent
        const parent = await prisma.user.findUnique({
            where: { id: parentId },
            select: { email: true, profile: { select: { firstName: true } } }
        });

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: childId },
            data: { passwordHash }
        });

        // Invalider toutes les sessions actives de l'enfant
        await prisma.session.deleteMany({ where: { userId: childId } });
        await prisma.refreshToken.deleteMany({ where: { userId: childId } });

        // Email de notification au parent avec le nouveau mot de passe
        if (parent?.email) {
            const parentName = parent.profile?.firstName || 'Parent';
            await emailService.sendParentChildPasswordChangedEmail(
                parent.email,
                parentName,
                child.username,
                newPassword
            );
        }

        return {
            success: true,
            message: `Password for ${child.username} has been reset successfully`
        };
    }

    // ============ CONNEXION ============
    async login(data, req) {
        const { loginInfo, password } = data;

        // Rate limiting login via Redis (5 tentatives / 15 min par loginInfo)
        const rateLimitKey = `auth:login:attempts:${loginInfo}`;
        const attempts = await cacheGet(rateLimitKey) || 0;
        if (attempts >= 5) throw new AppError(429, 'Too many login attempts. Try again in 15 minutes.');

        const userSelect = {
            id: true, email: true, phone: true, username: true, passwordHash: true,
            accountType: true, parentId: true, isVerified: true, isActive: true,
            firstLogin: true, lastLogin: true,
            languageProgress: { select: { status: true, overallProgress: true, language: { select: { id: true, name: true, code: true, flagUrl: true } } } },
            levelProgress: { select: { status: true, progressPercentage: true, level: { select: { id: true, name: true, code: true } } } }
        };

        const user = await findUserByLoginInfo(loginInfo, userSelect);

        if (!user) {
            await Promise.all([
                cacheSet(rateLimitKey, attempts + 1, 15 * 60),
                this.logLoginAttempt(loginInfo, null, false)
            ]);
            throw new AppError(401, 'Invalid credentials');
        }

        if (!user.isActive) {
            this.logLoginAttempt(loginInfo, user.id, false).catch(() => {});
            throw new AppError(401, 'Your account is not active');
        }

        if (!user.isVerified) {
            this.logLoginAttempt(loginInfo, user.id, false).catch(() => {});
            throw new AppError(401, 'Your account is not verified. Please check your email for the activation code.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            await Promise.all([
                cacheSet(rateLimitKey, attempts + 1, 15 * 60),
                this.logLoginAttempt(loginInfo, user.id, false)
            ]);
            throw new AppError(401, 'Invalid credentials');
        }

        // Reset rate limit + MAJ lastLogin + génération tokens + session — en parallèle
        const firstLogin = user.firstLogin;
        const [tokens] = await Promise.all([
            this.generateTokens(user.id, user.accountType),
            cacheDel(rateLimitKey),
            prisma.user.update({ where: { id: user.id }, data: { firstLogin: false, lastLogin: new Date(), lastActive: new Date() } }),
            this.createSession(user.id, req),
            this.logLoginAttempt(loginInfo, user.id, true),
            // Invalider le cache profil utilisateur
            cacheDel(`user:${user.id}:current`, `user:${user.id}:base`),
        ]);

        const { passwordHash, ...userWithoutPassword } = user;
        return { user: { ...userWithoutPassword, firstLogin }, tokens };
    }

    // ============ MOT DE PASSE OUBLIÉ ============
    async forgotPassword(loginInfo) {
        // Rate limiting via Redis — évite la requête DB inutile
        const rateLimitKey = `auth:otp:${loginInfo}`;
        const otpCount = await cacheGet(rateLimitKey) || 0;
        if (otpCount >= 3) throw new AppError(429, 'Too many reset requests. Try again later.');

        const user = await findUserByLoginInfo(loginInfo, { id: true, email: true, phone: true });

        // Réponse générique (sécurité — ne pas révéler si le compte existe)
        if (!user) return { success: true, message: 'If an account exists, a code has been sent' };

        const OTP_EXPIRATION_MINUTES = 5;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

        // Stocker l'OTP haché dans Redis (évite une requête DB à chaque vérification)
        // Format : { hash, expiresAt, attempts }
        const codeHash = await bcrypt.hash(otp, 10);
        await cacheSet(`auth:otp:code:${user.id}`, { hash: codeHash, expiresAt: expiresAt.getTime(), attempts: 0 }, OTP_EXPIRATION_MINUTES * 60);

        // Incrémenter le compteur rate limit
        await cacheSet(rateLimitKey, otpCount + 1, 60 * 60);

        // Supprimer anciens codes DB + créer le nouveau — en parallèle
        await Promise.all([
            prisma.verificationCode.deleteMany({ where: { userId: user.id, type: 'RESET_PASSWORD', isUsed: false } }),
            prisma.verificationCode.create({
                data: {
                    user: { connect: { id: user.id } },
                    contactType: user.email ? 'EMAIL' : 'PHONE',
                    contactValue: user.email || user.phone,
                    codeHash,
                    type: 'RESET_PASSWORD',
                    expiresAt
                }
            }),
            user.email ? emailService.sendPasswordResetOTP(user.email, otp) : Promise.resolve()
        ]);

        return { success: true, message: 'If an account exists, a code has been sent' };
    }


    // ============ Verify code  ============
    async verifyCode(loginInfo, inputOTP) {
        const user = await findUserByLoginInfo(loginInfo, { id: true });
        if (!user) throw new AppError(400, 'Invalid or expired code');

        // Vérifier depuis Redis d'abord (0 requête DB si présent)
        const cached = await cacheGet(`auth:otp:code:${user.id}`);
        if (cached) {
            if (Date.now() > cached.expiresAt) throw new AppError(400, 'Code expired');
            if (cached.attempts >= 5) throw new AppError(429, 'Too many attempts');

            const valid = await bcrypt.compare(inputOTP, cached.hash);
            if (!valid) {
                await cacheSet(`auth:otp:code:${user.id}`, { ...cached, attempts: cached.attempts + 1 }, Math.ceil((cached.expiresAt - Date.now()) / 1000));
                throw new AppError(400, 'Invalid code');
            }
            return { success: true, message: 'Code verified successfully' };
        }

        // Fallback DB si Redis n'a pas le code
        const record = await prisma.verificationCode.findFirst({ where: { userId: user.id, type: 'RESET_PASSWORD', isUsed: false }, orderBy: { createdAt: 'desc' } });
        if (!record) throw new AppError(400, 'Invalid or expired code');
        if (record.expiresAt < new Date()) throw new AppError(400, 'Code expired');
        if (record.attempts >= 5) throw new AppError(429, 'Too many attempts');

        const valid = await bcrypt.compare(inputOTP, record.codeHash);
        if (!valid) {
            await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
            throw new AppError(400, 'Invalid code');
        }

        return { success: true, message: 'Code verified successfully' };
    }


    async resetPassword(loginInfo, otp, password) {
        const user = await findUserByLoginInfo(loginInfo, { id: true, email: true });
        if (!user) throw new AppError(400, 'Invalid request');

        // Vérifier OTP depuis Redis
        const cached = await cacheGet(`auth:otp:code:${user.id}`);
        let valid = false;

        if (cached) {
            if (Date.now() > cached.expiresAt) throw new AppError(400, 'Code expired');
            valid = await bcrypt.compare(otp, cached.hash);
        } else {
            // Fallback DB
            const record = await prisma.verificationCode.findFirst({ where: { userId: user.id, type: 'RESET_PASSWORD', isUsed: false }, orderBy: { createdAt: 'desc' } });
            if (!record || record.expiresAt < new Date()) throw new AppError(400, 'Invalid or expired code');
            valid = await bcrypt.compare(otp, record.codeHash);
            if (valid) await prisma.verificationCode.update({ where: { id: record.id }, data: { isUsed: true } });
        }

        if (!valid) throw new AppError(400, 'Invalid code');

        const passwordHash = await bcrypt.hash(password, 12);

        // Toutes les opérations en parallèle
        await Promise.all([
            prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
            prisma.session.deleteMany({ where: { userId: user.id } }),
            prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
            cacheDel(`auth:otp:code:${user.id}`, `auth:otp:${loginInfo}`, `user:${user.id}:current`, `user:${user.id}:base`),
            user.email ? emailService.sendPasswordChangedEmail(user.email) : Promise.resolve()
        ]);

        return { success: true, message: 'Password reset successfully' };
    }


    // ============ VERIFY EMAIL/PHONE ============
    async verifyAccount(token) {
        const verification = await prisma.verificationCode.findFirst({
            where: {
                code: token,
                type: 'registration',
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!verification) {
            throw new AppError(400, 'Invalid or expired verification token');
        }

        // Marquer l'utilisateur comme vérifié
        await prisma.user.update({
            where: { id: verification.userId },
            data: { isVerified: true },
        });

        // Marquer le code comme utilisé
        await prisma.verificationCode.update({
            where: { id: verification.id },
            data: { isUsed: true },
        });

        return { success: true, message: 'Account verified successfully' };
    }

    // ============ CHANGE PASSWORD ============
    async changePassword(userId, data) {
        const { currentPassword, newPassword } = data;

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true } });
        if (!user) throw new AppError(404, 'User not found');

        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) throw new AppError(400, 'Current password is incorrect');

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Tout en parallèle
        await Promise.all([
            prisma.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } }),
            prisma.session.deleteMany({ where: { userId } }),
            prisma.refreshToken.deleteMany({ where: { userId } }),
            cacheDel(`user:${userId}:current`, `user:${userId}:base`),
            user.email ? emailService.sendPasswordChangedEmail(user.email) : Promise.resolve()
        ]);

        return { success: true, message: 'Password changed successfully' };
    }

    // ============ LOGOUT ============
    async logout(userId, refreshToken, sessionToken) {
        // Supprimer le refresh token si fourni
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }

        // Supprimer la session si fournie
        if (sessionToken) {
            await prisma.session.deleteMany({ where: { sessionToken } });
        }

        return { success: true, message: 'Logged out successfully' };
    }

    // ============ REFRESH TOKEN ============
    async refreshToken(refreshToken) {
        try {
            // Vérifier le refresh token
            const decoded = jwt.verify(refreshToken, appConfig.refreshTokenSecret);

            // Trouver le token en base (findFirst car le champ token est de type Text)
            const storedToken = await prisma.refreshToken.findFirst({
                where: { token: refreshToken },
                include: { user: true },
            });

            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new AppError(401, 'Invalid refresh token');
            }

            // Supprimer l'ancien refresh token
            await prisma.refreshToken.delete({ where: { id: storedToken.id } });

            // Générer de nouveaux tokens
            const tokens = await this.generateTokens(storedToken.userId, storedToken.user.accountType);

            return tokens;
        } catch (error) {
            throw new AppError(401, 'Invalid refresh token');
        }
    }

    // ============ MÉTHODES HELPER ============

    // Générer les tokens JWT
    async generateTokens(userId, accountType) {
        // Access Token
        const accessToken = jwt.sign(
            {
                userId,
                accountType,
                tokenType: 'access',
            },
            appConfig.jwtSecret,
            { expiresIn: appConfig.tokens.accessTokenExpiry },
        );

        // Refresh Token
        const refreshToken = jwt.sign(
            {
                userId,
                tokenType: 'refresh',
            },
            appConfig.refreshTokenSecret,
            { expiresIn: appConfig.tokens.refreshTokenExpiry },
        );

        // Stocker le refresh token en base
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt: new Date(Date.now() + appConfig.tokens.refreshTokenExpiry * 1000),
            },
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: appConfig.tokens.accessTokenExpiry,
        };
    }

    // Créer une session utilisateur
    async createSession(userId, req) {
        const sessionToken = crypto.randomBytes(64).toString('hex');

        await prisma.session.create({
            data: {
                sessionToken,
                userId,
                deviceInfo: req
                    ? {
                          userAgent: req.get('User-Agent'),
                          ip: req.ip,
                      }
                    : null,
                ipAddress: req ? req.ip : null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            },
        });

        return sessionToken;
    }

    // Créer un code de vérification
    async createVerificationCode(userId, contactType, contactValue, type, code) {
        const codeHash = await bcrypt.hash(code, 10);
        
        await prisma.verificationCode.create({
            data: {
                user: {
                    connect: { id: userId }
                },
                contactType,
                contactValue,
                codeHash,
                type,
                expiresAt: new Date(Date.now() + appConfig.tokens.verificationTokenExpiry * 1000),
            },
        });
    }

    // Créer un abonnement trial pour un nouveau learner
    async _createTrialSubscription(userId, tx) {
        // Lectures hors transaction (lecture seule, pas besoin d'atomicité)
        const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { planCode: 'TRIAL' } });
        if (!trialPlan) throw new AppError(500, 'Plan TRIAL introuvable. Contactez un administrateur.');

        // Lecture du setting avec fallback si la table n'existe pas encore sur ce serveur
        let trialDays = 14;
        try {
            const setting = await prisma.appSetting.findUnique({ where: { key: 'trial_duration_days' } });
            if (setting) trialDays = parseInt(setting.value, 10);
        } catch (_) {
            // table app_settings absente — on garde 14 jours par défaut
        }

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + trialDays);

        // Écritures dans la transaction
        const db = tx ?? prisma;

        const subscription = await db.subscription.create({
            data: {
                userId,
                planId: trialPlan.id,
                status: 'active',
                billingCycle: 'trial',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
        });

        await db.user.update({
            where: { id: userId },
            data: {
                subscriptionId: subscription.id,
                subscriptionEndsAt: periodEnd,
            },
        });
    }

    // Logger les tentatives de connexion
    async logLoginAttempt(identifier, userId, success) {
        await prisma.loginAttempt.create({
            data: {
                email: identifier && identifier.includes('@') ? identifier : null,
                phone: identifier && !identifier.includes('@') ? identifier : null,
                success,
                userId,
            },
        });
    }
}

const authService = new AuthService();
module.exports = { authService };
