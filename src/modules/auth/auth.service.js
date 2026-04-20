const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../../config/prisma');
const { appConfig } = require('../../config/appConfig');
const { AppError } = require('../../middleware/errorHandler');
const {allowRoles} = require('../../middleware/authMiddleware');
const { emailService } = require('../../utils/emailService');
const { logger } = require('../../utils/logger');

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

        let generatedUsername = username ?? null;
        if (finalAccountType === 'learner') {
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

        const user = await prisma.user.create({
            data: {
                email,
                phone,
                username: generatedUsername,
                passwordHash,
                accountType: finalAccountType,
                profile: { create: { firstName, lastName } }
            },
            include: { profile: true }
        });

        if (finalAccountType === 'learner' && email && generatedUsername) {
            await emailService.sendWelcomeChildEmail(email, generatedUsername);
        }

        return {
            success: true,
            message: 'User registered successfully',
            username: generatedUsername,
            email: user.email
        };
    }

    // ============ CRÉATION COMPTE ENFANT (réservée au parent connecté) ============
    async addChildAccount(parentId, data) {
        const { password, firstName, lastName, phone, email } = data;

        // Vérifier que le parent existe et est un learner
        const parent = await prisma.user.findUnique({
            where: { id: parentId },
            select: { id: true, accountType: true, phone: true }
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

        if (email) {
            await emailService.sendWelcomeChildEmail(email, uniqueUsername);
        }

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
            where: {
                id: childId,
                parentId,
                accountType: 'sub_account_learner'
            },
            select: { id: true, username: true, email: true }
        });

        if (!child) {
            throw new AppError(404, 'Child account not found or does not belong to you');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: childId },
            data: { passwordHash }
        });

        // Invalider toutes les sessions actives de l'enfant
        await prisma.session.deleteMany({ where: { userId: childId } });
        await prisma.refreshToken.deleteMany({ where: { userId: childId } });

        return {
            success: true,
            message: `Password for ${child.username} has been reset successfully`
        };
    }

    // ============ CONNEXION ============
    async login(data, req) {
        const { loginInfo, password } = data;
        let user = null;

        const userSelect = {
            id: true,
            email: true,
            phone: true,
            username: true,
            passwordHash: true,
            accountType: true,
            parentId: true,
            isVerified: true,
            isActive: true,
            firstLogin: true,
            lastLogin: true,
            languageProgress: {
                select: {
                    status: true,
                    overallProgress: true,
                    language: { select: { id: true, name: true, code: true, flagUrl: true } }
                }
            },
            levelProgress: {
                select: {
                    status: true,
                    progressPercentage: true,
                    level: { select: { id: true, name: true, code: true } }
                }
            }
        };

        if (loginInfo.includes('@')) {
            user = await prisma.user.findUnique({ where: { email: loginInfo }, select: userSelect });
        } else if (/^\+?\d+$/.test(loginInfo)) {
            user = await prisma.user.findFirst({ where: { phone: loginInfo }, select: userSelect });
        } else {
            user = await prisma.user.findUnique({ where: { username: loginInfo }, select: userSelect });
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
        let firstLogin = user.firstLogin;
        if (firstLogin) {
            // Mettre à jour le flag firstLogin à false
            await prisma.user.update({
                where: { id: user.id },
                data: { firstLogin: false, lastLogin: new Date(), lastActive: new Date() },
            });
        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date(), lastActive: new Date() },
            });
        }

        // Générer les tokens
        const tokens = await this.generateTokens(user.id, user.accountType);
        

        // Créer une session
        await this.createSession(user.id, req);

        const { passwordHash, ...userWithoutPassword } = user;

        await this.logLoginAttempt(loginInfo, user.id, true);

        return {
            user: { ...userWithoutPassword, firstLogin },
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

        // Toujours réponse générique (sécurité)
        if (!user) {
            return { success: true, message: 'If an account exists, a code has been sent' };
        }

        const MAX_REQUESTS_PER_HOUR = 3;
        const OTP_EXPIRATION_MINUTES = 5;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const requestCount = await prisma.verificationCode.count({
            where: {
                userId: user.id,
                type: "RESET_PASSWORD",
                createdAt: { gte: oneHourAgo }
            }
        });

        if (requestCount >= MAX_REQUESTS_PER_HOUR) {
            throw new AppError(429, 'Too many reset requests. Try again later.');
        }

        // Générer OTP 6 chiffres
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(otp, 10);

        const expiresAt = new Date(
            Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000
        );

        // Supprimer anciens codes non utilisés
        await prisma.verificationCode.deleteMany({
            where: {
                userId: user.id,
                type: "RESET_PASSWORD",
                isUsed: false
            }
        });

        await prisma.verificationCode.create({
            data: {
                user: {
                    connect: { id: user.id }
                },
                contactType: user.email ? "EMAIL" : "PHONE",
                contactValue: user.email || user.phone,
                codeHash,
                type: "RESET_PASSWORD",
                expiresAt
            }
        });

        if (user.email) {
            await emailService.sendPasswordResetOTP(user.email, otp);
        }

        return { success: true, message: 'If an account exists, a code has been sent' };
    }


    // ============ Verify code  ============
    async verifyCode(loginInfo, inputOTP) {

        let user;

        if (loginInfo.includes('@')) {
            user = await prisma.user.findUnique({ where: { email: loginInfo } });
        } else if (/^\+?\d+$/.test(loginInfo)) {
            user = await prisma.user.findFirst({ where: { phone: loginInfo } });
        } else {
            user = await prisma.user.findUnique({ where: { username: loginInfo } });
        }

        if (!user) {
            throw new AppError(400, 'Invalid or expired code');
        }

        const record = await prisma.verificationCode.findFirst({
            where: {
                userId: user.id,
                type: "RESET_PASSWORD",
                isUsed: false
            },
            orderBy: { createdAt: "desc" }
        });

        if (!record) {
            throw new AppError(400, 'Invalid or expired code');
        }

        if (record.expiresAt < new Date()) {
            throw new AppError(400, 'Code expired');
        }

        if (record.attempts >= 5) {
            throw new AppError(429, 'Too many attempts');
        }

        const valid = await bcrypt.compare(inputOTP, record.codeHash);

        if (!valid) {
            await prisma.verificationCode.update({
                where: { id: record.id },
                data: { attempts: { increment: 1 } }
            });

            throw new AppError(400, 'Invalid code');
        }

        return { success: true, message: 'Code verified successfully' };
    }


    async resetPassword(loginInfo, otp, password) {

        let user;

        if (loginInfo.includes('@')) {
            user = await prisma.user.findUnique({ where: { email: loginInfo } });
        } else if (/^\+?\d+$/.test(loginInfo)) {
            user = await prisma.user.findFirst({ where: { phone: loginInfo } });
        } else {
            user = await prisma.user.findUnique({ where: { username: loginInfo } });
        }

        if (!user) {
            throw new AppError(400, 'Invalid request');
        }

        const record = await prisma.verificationCode.findFirst({
            where: {
                userId: user.id,
                type: "RESET_PASSWORD",
                isUsed: false
            },
            orderBy: { createdAt: "desc" }
        });

        if (!record) {
            throw new AppError(400, 'Invalid or expired code');
        }

        if (record.expiresAt < new Date()) {
            throw new AppError(400, 'Code expired');
        }

        const valid = await bcrypt.compare(otp, record.codeHash);

        if (!valid) {
            throw new AppError(400, 'Invalid code');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        await prisma.verificationCode.update({
            where: { id: record.id },
            data: { isUsed: true }
        });

        // Invalider sessions
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

        if (user.email) {
            await emailService.sendPasswordChangedEmail(user.email);
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
