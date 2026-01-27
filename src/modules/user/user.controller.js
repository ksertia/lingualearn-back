const { asyncHandler } = require('../../middleware/asyncHandler');
const { userService } = require('./user.service');

const userController = {
    // Récupérer tous les utilisateurs (admin seulement)
    getAllUsers: asyncHandler(async (req, res) => {
        // Vérifier si l'utilisateur est admin
        if (req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can access this resource'
            });
        }
        
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
    
    // Récupérer un utilisateur par ID
    getUserById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        // Vérifier les permissions
        if (req.user.accountType !== 'admin' && req.user.id !== id) {
            return res.status(403).json({
                success: false,
                error: 'You can only view your own profile'
            });
        }
        
        const user = await userService.getUserById(id);
        
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
        const user = await userService.getUserById(req.user.id);
        
        res.json({
            success: true,
            data: user
        });
    })
};

module.exports = { userController };
