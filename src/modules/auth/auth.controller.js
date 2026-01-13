const { asyncHandler } = require('../../middleware/asyncHandler');
const { authService } = require('./auth.service');
const { 
    registerSchema, 
    loginSchema, 
    forgotPasswordSchema,
    resetPasswordSchema,
    verifySchema,
    changePasswordSchema,
    refreshTokenSchema
} = require('./auth.schema');

const authController = {
    // Inscription
    register: asyncHandler(async (req, res) => {
        const validatedData = registerSchema.parse(req.body);
        const result = await authService.register(validatedData);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    }),
    
    // Connexion
    login: asyncHandler(async (req, res) => {
        const validatedData = loginSchema.parse(req.body);
        const result = await authService.login(validatedData, req);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: result
        });
    }),
    
    // Mot de passe oublié
    forgotPassword: asyncHandler(async (req, res) => {
        const validatedData = forgotPasswordSchema.parse(req.body);
        const result = await authService.forgotPassword(validatedData.loginInfo);
        res.json(result);
    }),
    
    // Réinitialisation du mot de passe
    resetPassword: asyncHandler(async (req, res) => {
        const validatedData = resetPasswordSchema.parse(req.body);
        const result = await authService.resetPassword(validatedData);
        
        res.json(result);
    }),
    
    // Vérification du compte
    verifyAccount: asyncHandler(async (req, res) => {
        const { token } = verifySchema.parse(req.body);
        const result = await authService.verifyAccount(token);
        
        res.json(result);
    }),
    
    // Changement de mot de passe (utilisateur connecté)
    changePassword: asyncHandler(async (req, res) => {
        const validatedData = changePasswordSchema.parse(req.body);
        const result = await authService.changePassword(req.user.id, validatedData);
        
        res.json(result);
    }),
    
    // Rafraîchir le token
    refreshToken: asyncHandler(async (req, res) => {
        const validatedData = refreshTokenSchema.parse(req.body);
        const tokens = await authService.refreshToken(validatedData.refreshToken);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens
        });
    }),
    
    // Déconnexion
    logout: asyncHandler(async (req, res) => {
        const { refreshToken, sessionToken } = req.body;
        const result = await authService.logout(req.user?.id, refreshToken, sessionToken);
        
        res.json(result);
    }),
    
    // Profil utilisateur
    getProfile: asyncHandler(async (req, res) => {
        // req.user est défini par le authMiddleware
        const user = req.user;
        
        res.json({
            success: true,
            data: { user }
        });
    }),
    
    // Vérifier si l'utilisateur est connecté
    checkAuth: asyncHandler(async (req, res) => {
        res.json({
            success: true,
            authenticated: true,
            user: req.user
        });
    })
};

module.exports = { authController };
