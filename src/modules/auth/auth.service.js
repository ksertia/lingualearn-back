const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../../config/prisma');
const { appConfig } = require('../../config/appConfig');
const { AppError } = require('../../middleware/errorHandler');
const { emailService } = require('../../utils/emailService');
const { logger } = require('../../utils/logger');

class AuthService {
    // ============ INSCRIPTION ============
    async register(data) {
        const { email, phone, password, username, userType, parentId, firstName, lastName } = data;

        // Mapper userType (du frontend) vers accountType (pour Prisma)
        let accountType = 'user';
        if (userType === 'admin') accountType = 'admin';
        else if (userType === 'parent') accountType = 'user';
        else if (userType === 'child') accountType = 'sub_account';
        else if (userType === 'teacher') accountType = 'teacher';

        // Vérifier que l'utilisateur fournit soit email, soit phone
        if (!email && !phone) {
            throw new AppError(400, 'Either email or phone must be provided');
        }

        // Vérifier si l'utilisateur existe déjà par email
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                throw new AppError(400, 'A user already exists with this email');
            }
        }

        // Vérifier si l'utilisateur existe déjà par phone
        if (phone) {
            const existingUser = await prisma.user.findFirst({ where: { phone } });
            if (existingUser) {
                throw new AppError(400, 'A user already exists with this phone number');
            }
        }

        // Vérifier si le username existe déjà
        if (username) {
            const existingUser = await prisma.user.findUnique({ where: { username } });
            if (existingUser) {
                throw new AppError(400, 'Username already taken');
            }
        }

        // Vérifier le parent pour les comptes enfants
        if (accountType === 'sub_account' && parentId) {
            const parent = await prisma.user.findUnique({
                where: { id: parentId, accountType: 'user' }
            });
            if (!parent) {
                throw new AppError(400, 'Parent account not found or invalid');
            }
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 12);

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                phone,
                username,
                passwordHash,
                accountType,
                parentId: accountType === 'sub_account' ? parentId : null,
                profile: {
                    create: {
                        firstName,
                        lastName
                    }
                }
            },
            include: { profile: true }
        });

        // Générer un code de vérification si email ou phone fourni
        if (email || phone) {
            const code = crypto.randomBytes(3).toString('hex').toUpperCase();
            const contactType = email ? 'email' : 'phone';
            const contactValue = email || phone;
            await this.createVerificationCode(user.id, contactType, contactValue, 'registration', code);
            // Envoi du code de vérification par email si email fourni
            if (email) {
                await emailService.sendVerificationEmail(email, code);
            }
            // (Optionnel) Envoi par SMS si phone fourni
        }

        return { success: true, message: 'User registered successfully' };
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

        // Mettre à jour lastLogin
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), lastActive: new Date() },
        });

        // Générer les tokens
        const tokens = await this.generateTokens(user.id, user.accountType);

        // Créer une session
        await this.createSession(user.id, req);

        // Retourner les données utilisateur sans le mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        await this.logLoginAttempt(loginInfo, user.id, true);

        return {
            user: userWithoutPassword,
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
        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash },
        });

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
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

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
