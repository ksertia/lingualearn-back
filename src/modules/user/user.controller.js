const { asyncHandler } = require('../../middleware/asyncHandler');
const { userService } = require('./user.service');

const userController = {
    // Récupérer tous les utilisateurs (admin seulement — allowRoles sur la route)
    getAllUsers: asyncHandler(async (req, res) => {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            accountType: req.query.userType,
            status: req.query.status,
            search: req.query.search
        };
        
        const result = await userService.getAllUsers(filters);
        
        res.json({
            success: true,
            data: result
        });
    }),

    // Récupérer les utilisateurs selon des filtres de profil
    getUsersByProfileFilters: asyncHandler(async (req, res) => {

        const filters = {
            country: req.query.country,
            language: req.query.language,
            level: req.query.level,
            accountType: req.query.accountType,
            minAge: req.query.minAge,
            maxAge: req.query.maxAge,
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search
        };

        const result = await userService.getUsersByProfileFilters(filters);

        res.json({
            success: true,
            data: result
        });
    }),
    
    // Récupérer un utilisateur par ID (soi-même, ou admin — allowSelfOrRoles sur la route)
    getUserById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const user = await userService.getUserDetailsById(id);
        
        res.json({
            success: true,
            data: user
        });
    }),
    
    // Mettre à jour un utilisateur
    updateUser: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updatedUser = await userService.updateUser(id, req.body, req.user.id, req.user.accountType);
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    }),
    
    // Supprimer un utilisateur
    deleteUser: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await userService.deleteUser(id, req.user.id, req.user.accountType);
        
        res.json(result);
    }),
    
    // Récupérer les statistiques (admin seulement)
    getStats: asyncHandler(async (req, res) => {
        if (req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can access statistics'
            });
        }
        
        const stats = await userService.getUserStats();
        
        res.json({
            success: true,
            data: stats
        });
    }),
    
    // Récupérer le profil actuel
    getCurrentUser: asyncHandler(async (req, res) => {
        const user = await userService.getCurrentUserDetails(req.user.id);

        res.json({
            success: true,
            data: user
        });
    }),

    // Récupérer les comptes enfants du parent connecté
    getMyChildren: asyncHandler(async (req, res) => {
        const result = await userService.getMyChildren(req.user.id);
        res.json(result);
    }),

    // Progression actuelle de l'enfant connecté
    getMyProgress: asyncHandler(async (req, res) => {
        const langService = require('../language/language.service');
        const result = await langService.getMyProgress(req.user.id);
        res.json(result);
    })
};

module.exports = { userController };