const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

class UserService {
    // Récupérer tous les utilisateurs (admin seulement)
    async getAllUsers(filters = {}) {
        const { page = 1, limit = 20, userType, status, search } = filters;
        const skip = (page - 1) * limit;
        
        const where = {};
        
        if (userType) {
            where.accountType = userType;
        }
        
        if (status) {
            where.status = status;
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
                    isVerified: true,
                    lastLogin: true,
                    lastActive: true,
                    createdAt: true
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
                familyId: true,
                isVerified: true,
                subscriptionPlan: true,
                subscriptionEndsAt: true,
                status: true,
                lastLogin: true,
                lastActive: true,
                createdAt: true,
                updatedAt: true,
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
    
    // Mettre à jour un utilisateur
    async updateUser(id, data, currentUserId, currentUserType) {
        // Vérifier les permissions
        if (currentUserType !== 'admin' && id !== currentUserId) {
            throw new AppError(403, 'You can only update your own profile');
        }
        
        // Vérifier si l'utilisateur existe
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        
        if (!existingUser) {
            throw new AppError(404, 'User not found');
        }
        
        // Admin seulement peut changer certains champs
        const updateData = {};
        
        // Champs que l'utilisateur peut modifier
        if (data.username !== undefined) {
            // Vérifier si le username est unique
            if (data.username !== existingUser.username) {
                const usernameExists = await prisma.user.findUnique({
                    where: { username: data.username }
                });
                
                if (usernameExists) {
                    throw new AppError(400, 'Username already taken');
                }
                updateData.username = data.username;
            }
        }
        
        // Seul l'admin peut modifier ces champs
        if (currentUserType === 'admin') {
            if (data.accountType !== undefined) updateData.accountType = data.accountType;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.subscriptionPlan !== undefined) updateData.subscriptionPlan = data.subscriptionPlan;
            if (data.subscriptionEndsAt !== undefined) updateData.subscriptionEndsAt = data.subscriptionEndsAt;
        }
        
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
                status: true,
                subscriptionPlan: true,
                subscriptionEndsAt: true,
                updatedAt: true
            }
        });
        
        return updatedUser;
    }
    
    // Supprimer un utilisateur (soft delete)
    async deleteUser(id, currentUserId, currentUserType) {
        // Seul l'admin peut supprimer des comptes (ou l'utilisateur lui-même)
        if (currentUserType !== 'admin' && id !== currentUserId) {
            throw new AppError(403, 'You can only delete your own account');
        }
        
        const user = await prisma.user.findUnique({
            where: { id }
        });
        
        if (!user) {
            throw new AppError(404, 'User not found');
        }
        
        // Soft delete: changer le statut
        await prisma.user.update({
            where: { id },
            data: { status: 'deleted' }
        });
        
        // Invalider toutes les sessions
        await prisma.session.deleteMany({
            where: { userId: id }
        });
        
        // Invalider tous les refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId: id }
        });
        
        return { success: true, message: 'User deleted successfully' };
    }
    
    // Récupérer les statistiques des utilisateurs (admin seulement)
    async getUserStats() {
        const stats = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN "status" = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN "userType" = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN "userType" = 'parent' THEN 1 END) as parent_users,
                COUNT(CASE WHEN "userType" = 'child' THEN 1 END) as child_users,
                COUNT(CASE WHEN "userType" = 'teacher' THEN 1 END) as teacher_users,
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
