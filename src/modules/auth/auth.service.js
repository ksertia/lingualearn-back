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
        const { email, phone, password, username, accountType, parentId } = data;
        
        // Vérifier que l'utilisateur fournit soit email, soit phone
        if (!email && !phone) {
            throw new AppError(400, 'Either email or phone must be provided');
        }
        
        // Vérifier si l'utilisateur existe déjà par email
        if (email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            
            if (existingUser) {
                throw new AppError(400, 'A user already exists with this email');
            }
        }
        
        // Vérifier si l'utilisateur existe déjà par phone
        if (phone) {
            const existingUser = await prisma.user.findFirst({
                where: { phone }
            });
            
            if (existingUser) {
                throw new AppError(400, 'A user already exists with this phone number');
            }
        }
        
        // Vérifier si le username existe déjà
        if (username) {
            const existingUser = await prisma.user.findUnique({
                where: { username }
            });
            
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
                throw new AppError(400, 'Invalid parent ID or parent not found');
            }
        }
        
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Générer un token de vérification
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + appConfig.tokens.verificationTokenExpiry * 1000);
        
        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email: email || null,
                phone: phone || null,
                username: username || null,
                passwordHash,
                accountType,
                parentId: accountType === 'sub_account' ? parentId : null,
                isVerified: false,
                status: 'active'
            },
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                accountType: true,
                isVerified: true,
                status: true,
                createdAt: true
            }
        });
        
        // Envoyer l'email de vérification si email fourni
        if (email) {
            await this.createVerificationCode(user.id, 'email', email, 'registration', verificationToken);
            await emailService.sendVerificationEmail(email, verificationToken);
        }
        
        // Pour les téléphones, on pourrait envoyer un SMS (implémentation à ajouter)
        
        // Log de l'inscription
        await this.logLoginAttempt(email || phone, null, true);
        
        // Générer les tokens immédiatement (l'utilisateur peut se connecter même sans vérifier)
        const tokens = await this.generateTokens(user.id, user.accountType);
        
        return {
            user,
            ...tokens,
            requiresVerification: !user.isVerified
        };
    }
    
    // ============ CONNEXION ============
    async login(data, req) {
        const { email, phone, password } = data;
        
        // Trouver l'utilisateur par email ou phone
        let user;
        if (email) {
            user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    passwordHash: true,
                    accountType: true,
                    isVerified: true,
                    status: true,
                    lastLogin: true
                }
            });
        } else if (phone) {
            user = await prisma.user.findFirst({
                where: { phone },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    username: true,
                    passwordHash: true,
                    accountType: true,
                    isVerified: true,
                    status: true,
                    lastLogin: true
                }
            });
        }
        
        if (!user) {
            await this.logLoginAttempt(email || phone, null, false);
            throw new AppError(401, 'Invalid credentials');
        }
        
        if (user.status !== 'active') {
            await this.logLoginAttempt(email || phone, user.id, false);
            throw new AppError(401, 'Your account is not active');
        }
        
        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            await this.logLoginAttempt(email || phone, user.id, false);
            throw new AppError(401, 'Invalid credentials');
        }
        
        // Mettre à jour lastLogin
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), lastActive: new Date() }
        });
        
        // Générer les tokens
        const tokens = await this.generateTokens(user.id, user.accountType);
        
        // Créer une session
        await this.createSession(user.id, req);
        
        // Retourner les données utilisateur sans le mot de passe
        const { passwordHash, ...userWithoutPassword } = user;
        
        await this.logLoginAttempt(email || phone, user.id, true);
        
        return {
            user: userWithoutPassword,
            ...tokens
        };
    }
    
    // ============ FORGOT PASSWORD ============
    async forgotPassword(data) {
        const { email, phone } = data;
        
        // Trouver l'utilisateur
        let user;
        if (email) {
            user = await prisma.user.findUnique({
                where: { email, status: 'active' }
            });
        } else if (phone) {
            user = await prisma.user.findFirst({
                where: { phone, status: 'active' }
            });
        }
        
        if (!user) {
            // Pour des raisons de sécurité, on ne révèle pas si l'utilisateur existe
            return { success: true, message: 'If an account exists, a reset link has been sent' };
        }
        
        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + appConfig.tokens.resetTokenExpiry * 1000);
        
        // Supprimer les anciens tokens
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id }
        });
        
        // Créer un nouveau token
        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt: resetTokenExpires
            }
        });
        
        // Envoyer l'email de réinitialisation
        if (user.email) {
            await emailService.sendPasswordResetEmail(user.email, resetToken);
        }
        
        // Pour les téléphones, on pourrait envoyer un SMS
        
        return { success: true, message: 'If an account exists, a reset link has been sent' };
    }
    
    // ============ RESET PASSWORD ============
    async resetPassword(data) {
        const { token, password } = data;
        
        // Trouver le token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true }
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
            data: { passwordHash }
        });
        
        // Marquer le token comme utilisé
        await prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true }
        });
        
        // Invalider toutes les sessions existantes
        await prisma.session.deleteMany({
            where: { userId: resetToken.userId }
        });
        
        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId: resetToken.userId }
        });
        
        // Envoyer un email de confirmation
        if (resetToken.user.email) {
            await emailService.sendPasswordChangedEmail(resetToken.user.email);
        }
        
        return { success: true, message: 'Password reset successfully' };
    }
    
    // ============ VERIFY EMAIL/PHONE ============
    async verifyAccount(token) {
        // Cette méthode pourrait être implémentée pour vérifier les emails/téléphones
        // Pour simplifier, on va créer une méthode basique
        
        const verification = await prisma.verificationCode.findFirst({
            where: { 
                code: token,
                type: 'registration',
                isUsed: false,
                expiresAt: { gt: new Date() }
            },
            include: { user: true }
        });
        
        if (!verification) {
            throw new AppError(400, 'Invalid or expired verification token');
        }
        
        // Marquer l'utilisateur comme vérifié
        await prisma.user.update({
            where: { id: verification.userId },
            data: { isVerified: true }
        });
        
        // Marquer le code comme utilisé
        await prisma.verificationCode.update({
            where: { id: verification.id },
            data: { isUsed: true }
        });
        
        return { success: true, message: 'Account verified successfully' };
    }
    
    // ============ CHANGE PASSWORD ============
    async changePassword(userId, data) {
        const { currentPassword, newPassword } = data;
        
        // Récupérer l'utilisateur avec le mot de passe
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true }
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
            data: { passwordHash: newPasswordHash }
        });
        
        // Invalider toutes les sessions existantes (sécurité)
        await prisma.session.deleteMany({
            where: { userId }
        });
        
        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId }
        });
        
        // Envoyer un email de notification
        const userDetails = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
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
            await prisma.refreshToken.deleteMany({
                where: { token: refreshToken }
            });
        }
        
        // Supprimer la session si fournie
        if (sessionToken) {
            await prisma.session.deleteMany({
                where: { sessionToken }
            });
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
                include: { user: true }
            });
            
            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new AppError(401, 'Invalid refresh token');
            }
            
            // Supprimer l'ancien refresh token
            await prisma.refreshToken.delete({
                where: { id: storedToken.id }
            });
            
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
        // Access Token (15 minutes par défaut)
        const accessToken = jwt.sign(
            { 
                userId, 
                accountType,
                tokenType: 'access'
            },
            appConfig.jwtSecret,
            { expiresIn: appConfig.tokens.accessTokenExpiry }
        );
        
        // Refresh Token (7 jours par défaut)
        const refreshToken = jwt.sign(
            { 
                userId,
                tokenType: 'refresh'
            },
            appConfig.refreshTokenSecret,
            { expiresIn: appConfig.tokens.refreshTokenExpiry }
        );
        
        // Stocker le refresh token en base
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt: new Date(Date.now() + appConfig.tokens.refreshTokenExpiry * 1000)
            }
        });
        
        return {
            accessToken,
            refreshToken,
            expiresIn: appConfig.tokens.accessTokenExpiry
        };
    }
    
    // Créer une session utilisateur
    async createSession(userId, req) {
        const sessionToken = crypto.randomBytes(64).toString('hex');
        
        await prisma.session.create({
            data: {
                sessionToken,
                userId,
                deviceInfo: req ? {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                } : null,
                ipAddress: req ? req.ip : null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
            }
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
                expiresAt: new Date(Date.now() + appConfig.tokens.verificationTokenExpiry * 1000)
            }
        });
    }
    
    // Logger les tentatives de connexion
    async logLoginAttempt(identifier, userId, success) {
        await prisma.loginAttempt.create({
            data: {
                email: identifier && identifier.includes('@') ? identifier : null,
                phone: identifier && !identifier.includes('@') ? identifier : null,
                success,
                userId
            }
        });
    }
}

const authService = new AuthService();
module.exports = { authService };
