const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../../config/prisma');
const { appConfig } = require('../../config/appConfig');
const { AppError } = require('../../middleware/errorHandler');
const {allowRoles} = require('../../middleware/authMiddleware');
const { emailService } = require('../../utils/emailService');
const { logger } = require('../../utils/logger');
const { createUserWithDefaults } = require('../../helpers/userCreationHelper');

async function retryPrismaUpdate(fn, retries = 5, baseDelay = 200) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isLockTimeout =
                (err.code === 'P2034') ||
                (err.code === 'P2002') ||
                (err.message && err.message.includes('Lock wait timeout exceeded')) ||
                (err.message && err.message.includes('ER_LOCK_WAIT_TIMEOUT')) ||
                (err.message && err.message.includes('code: 1205')) ||
                (err.message && err.message.includes('Deadlock'));
            
            if (isLockTimeout && i < retries - 1) {
                const jitter = Math.random() * 200;
                const delay = baseDelay * Math.pow(2, i) + jitter;
                logger.warn(`[Auth] Lock timeout on attempt ${i + 1}/${retries}, retrying in ${Math.round(delay)}ms`);
                await new Promise(res => setTimeout(res, delay));
                continue;
            }
            
            if (isLockTimeout) {
                logger.error(`[Auth] Lock timeout exhausted after ${retries} attempts:`, err.message);
            }
            throw err;
        }
    }
}

async function updateUserLoginTimestampsAsync(userId, firstLogin) {
    setImmediate(async () => {
        try {
            const updateData = {
                lastLogin: new Date(),
                lastActive: new Date()
            };
            
            if (firstLogin) {
                updateData.firstLogin = false;
            }
            
            await retryPrismaUpdate(() =>
                prisma.user.update({
                    where: { id: userId },
                    data: updateData,
                })
            );
        } catch (err) {
            logger.error(`[Auth] Failed to update login timestamps for user ${userId}:`, err);
        }
    });
}

class AuthService {
    // ============ INSCRIPTION ============
     async register(data) {
    const {
        email,
        phone,
        password,
        username,
        accountType,
        parentId,
        firstName,
        lastName
    } = data;

    // Mapper le type de compte
    const ACCOUNT_TYPE_MAP = {
        admin: 'admin',
        learner: 'learner',
        sub_account_learner: 'sub_account_learner',
        teacher: 'teacher',
        plateform_manager: 'plateform_manager',
    };
    const finalAccountType = ACCOUNT_TYPE_MAP[accountType];

    if (!email && !phone) {
        throw new AppError(400, 'Either email or phone must be provided');
    }

    // Vérifier email existant
    if (email) {
        
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) throw new AppError(400, 'A user already exists with this email');
    }

    // Vérifier phone existant
    if (phone) {
        const existingPhone = await prisma.user.findFirst({ where: { phone } });
        if (existingPhone) throw new AppError(400, 'A user already exists with this phone number');
    }

    // Générer username automatiquement pour les learners et sub_account_learner
    let generatedUsername = username ?? null;
    if (finalAccountType === 'sub_account_learner' && parentId) {
        // Génération basée sur le parent
        const parent = await prisma.user.findFirst({
            where: { id: parentId, accountType: 'learner' },
            select: { phone: true },
        });
        let parentPhone = parent && parent.phone ? parent.phone.replace(/^\+\d{3}/, '') : '';
        const firstFour = parentPhone.replace(/\D/g, '').slice(0, 4).padEnd(4, '0');
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const baseUsername = `${firstFour}-EDU-${day}${month}${year}`;
        let uniqueUsername = baseUsername;
        let suffix = 1;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${baseUsername}-${suffix}`;
            suffix++;
        }
        generatedUsername = uniqueUsername;
    } else if (finalAccountType === 'learner') {
        // Génération pour learner sans parent
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const baseUsername = `EDU-${day}${month}${year}`;
        let uniqueUsername = baseUsername;
        let suffix = 1;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${baseUsername}-${suffix}`;
            suffix++;
        }
        generatedUsername = uniqueUsername;
    }

    if (generatedUsername) {
        const existingUsername = await prisma.user.findUnique({ where: { username: generatedUsername } });
        if (existingUsername) throw new AppError(400, 'Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
        data: {
            email,
            phone,
            username: generatedUsername,
            passwordHash,
            accountType: finalAccountType,
            parentId: finalAccountType === 'sub_account_learner' ? parentId : null,
            isActive: true, // Tous les comptes sont actifs par défaut
            isVerified: true, // Tous les comptes sont vérifiés par défaut
            profile: { create: { firstName, lastName } }
        },
        include: { profile: true }
    });

    // Envoi email de bienvenue pour learners et sub_account_learner
    if ((finalAccountType === 'learner' || finalAccountType === 'sub_account_learner') && email && generatedUsername) {
        await emailService.sendWelcomeChildEmail(email, generatedUsername);
    }

    return {
        success: true,
        message: 'User registered successfully',
        username: generatedUsername,
        email: user.email
    };
}


    // ============ CONNEXION ============
    async login(data, req) {
        const { loginInfo, password } = data;
        let user = null;

        // Trouver l'utilisateur par email, phone ou username
        if (loginInfo.includes('@')) {
            user = await prisma.user.findUnique({
                where: { email: loginInfo },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    passwordHash: true,
                    accountType: true,
                    isVerified: true,
                    isActive: true,
                    lastLogin: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            birthDate: true,
                            avatarUrl: true,
                            timezone: true,
                            preferredLanguage: true
                        }
                    }
                },
            });
        } else if (/^\+?\d+$/.test(loginInfo)) {
            user = await prisma.user.findFirst({
                where: { phone: loginInfo },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    passwordHash: true,
                    accountType: true,
                    isVerified: true,
                    isActive: true,
                    lastLogin: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            birthDate: true,
                            avatarUrl: true,
                            timezone: true,
                            preferredLanguage: true
                        }
                    }
                },
            });
        } else {
            user = await prisma.user.findUnique({
                where: { username: loginInfo },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    passwordHash: true,
                    accountType: true,
                    isVerified: true,
                    isActive: true,
                    lastLogin: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            birthDate: true,
                            avatarUrl: true,
                            timezone: true,
                            preferredLanguage: true
                        }
                    }
                },
            });
        }

        // Vérifications

        if (!user) {
            await this.logLoginAttempt(loginInfo, null, false);
            throw new AppError(401, 'Invalid credentials');
        }

        if (!user.isActive) {
            await this.logLoginAttempt(loginInfo, user.id, false);
            throw new AppError(401, 'Your account is not active');
        }

        if (!user.isVerified) {
            await this.logLoginAttempt(loginInfo, user.id, false);
            throw new AppError(401, 'Your account is not verified. Please check your email for the activation code.');
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            await this.logLoginAttempt(loginInfo, user.id, false);
            throw new AppError(401, 'Invalid credentials');
        }

        // Vérifier la première connexion
        const firstLogin = user.firstLogin;

        // Générer les tokens
        const tokens = await this.generateTokens(user.id, user.accountType);
        

        // Créer une session
        await this.createSession(user.id, req);

        // Retourner les données utilisateur sans le mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        await this.logLoginAttempt(loginInfo, user.id, true);

        updateUserLoginTimestampsAsync(user.id, firstLogin);

        // Retourner uniquement la section profile dans user
        let userData = { ...userWithoutPassword, firstLogin };
        if (user.profile) {
            userData.profile = user.profile;
        }
        // Supprimer les champs à plat du profil s'ils existent
        delete userData.firstName;
        delete userData.lastName;
        delete userData.displayName;
        delete userData.birthDate;
        delete userData.avatarUrl;
        delete userData.timezone;
        delete userData.preferredLanguage;

        return {
            user: userData,
            tokens,
        };
    }

    // ============ MOT DE PASSE OUBLIÉ ============
    async forgotPassword(loginInfo) {
        let user;
        if (loginInfo.includes('@')) {
            user = await prisma.user.findUnique({ where: { email: loginInfo } });
        } else if (/^\+?\d+$/.test(loginInfo)) {
            user = await prisma.user.findFirst({ where: { phone: loginInfo } });
        } else {
            user = await prisma.user.findUnique({ where: { username: loginInfo } });
        }

        if (!user) {
            return { success: true, message: 'If an account exists, a reset link has been sent' };
        }

        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + appConfig.tokens.resetTokenExpiry * 1000);

        // Supprimer les anciens tokens
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

        // Créer un nouveau token
        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt: resetTokenExpires,
            },
        });

        // Envoyer l'email de réinitialisation
        if (user.email) {
            const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken);
            if (!emailSent) {
                logger.error(`Password reset email failed for ${user.email}`);
                throw new AppError(500, 'Erreur lors de l\'envoi de l\'email de réinitialisation. Contactez le support.');
            }
        }

        return { success: true, message: 'If an account exists, a reset link has been sent' };
    }

    // ============ RESET PASSWORD ============
    async resetPassword(data) {
        const { token, password } = data;

        // Trouver le token
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            throw new AppError(400, 'Invalid or expired reset token');
        }

        if (resetToken.used) {
            throw new AppError(400, 'Reset token has already been used');
        }

        if (resetToken.expiresAt < new Date()) {
            throw new AppError(400, 'Reset token has expired');
        }

        // Hasher le nouveau mot de passe
        const passwordHash = await bcrypt.hash(password, 12);

        // Mettre à jour le mot de passe de l'utilisateur
        await retryPrismaUpdate(() =>
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            })
        );

        // Marquer le token comme utilisé
        await prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true },
        });

        // Invalider toutes les sessions existantes
        await prisma.session.deleteMany({ where: { userId: resetToken.userId } });

        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } });

        // Envoyer un email de confirmation
        if (resetToken.user.email) {
            await emailService.sendPasswordChangedEmail(resetToken.user.email);
        }

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
        await retryPrismaUpdate(() =>
            prisma.user.update({
                where: { id: verification.userId },
                data: { isVerified: true },
            })
        );

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

        // Récupérer l'utilisateur avec le mot de passe
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Vérifier l'ancien mot de passe
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new AppError(400, 'Current password is incorrect');
        }

        // Hasher le nouveau mot de passe
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Mettre à jour le mot de passe
        await retryPrismaUpdate(() =>
            prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            })
        );

        // Invalider toutes les sessions existantes (sécurité)
        await prisma.session.deleteMany({ where: { userId } });

        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({ where: { userId } });

        // Envoyer un email de notification
        const userDetails = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (userDetails.email) {
            await emailService.sendPasswordChangedEmail(userDetails.email);
        }

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

            // Trouver le token en base
            const storedToken = await prisma.refreshToken.findUnique({
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
        await prisma.verificationCode.create({
            data: {
                userId,
                contactType,
                contactValue,
                code,
                type,
                expiresAt: new Date(Date.now() + appConfig.tokens.verificationTokenExpiry * 1000),
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
