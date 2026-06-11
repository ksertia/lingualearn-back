const { asyncHandler } = require('../../middleware/asyncHandler');
const { authService } = require('./auth.service');
const { AppError } = require('../../middleware/errorHandler');
const {
    registerSchema,
    addChildSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifySchema,
    changePasswordSchema,
    refreshTokenSchema,
    verifyOTPSchema
} = require('./auth.schema');

const authController = {

    // Inscription 
    register: asyncHandler(async (req, res) => {
        const validatedData = registerSchema.parse(req.body);
        const result = await authService.register(validatedData);
        // Ajoute le username et l'email dans la réponse si présents
        res.status(201).json({
            success: true,
            message: result.message,
            username: result.username,
            email: result.email,
            data: result
        });
    }),
    
    // Connexion
    login: asyncHandler(async (req, res) => {
        const validatedData = loginSchema.parse(req.body);
        const result = await authService.login(validatedData, req);
        let loginMsg = 'Login successful';
        if (result.user && result.user.firstLogin) {
            loginMsg += ' (first login)';
        }
        res.json({
            success: true,
            message: loginMsg,
            data: result
        });
    }),
    
    // Mot de passe oublié
    forgotPassword: asyncHandler(async (req, res) => {
        const validatedData = forgotPasswordSchema.parse(req.body);
        const result = await authService.forgotPassword(validatedData.loginInfo);
        res.json(result);
    }),

    // Nouveau controller pour verify-otp
    verifyOTP: asyncHandler(async (req, res) => {
    const { loginInfo, otp } = verifyOTPSchema.parse(req.body);

    // Appel du service avec le nom attendu
    const result = await authService.verifyCode(loginInfo, otp); // otp devient inputOTP dans le service

    res.json(result);
    }),

    
    // Réinitialisation du mot de passe
    resetPassword: asyncHandler(async (req, res) => {
        const { loginInfo, otp, password } = resetPasswordSchema.parse(req.body);
        const result = await authService.resetPassword(loginInfo, otp, password);
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
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        const tokens = await authService.refreshToken(refreshToken);
        // Réponse aplatie pour que Flutter lise accessToken/refreshToken directement
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
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
    }),

    // Création compte enfant par le parent connecté
    addChildAccount: asyncHandler(async (req, res) => {
        const validatedData = addChildSchema.parse(req.body);
        const result = await authService.addChildAccount(req.user.id, validatedData);
        res.status(201).json(result);
    }),

    // Réinitialisation mot de passe enfant par le parent
    resetChildPassword: asyncHandler(async (req, res) => {
        const { childId } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            throw new AppError(400, 'newPassword must be at least 6 characters');
        }
        const result = await authService.resetChildPassword(req.user.id, childId, newPassword);
        res.json(result);
    })
};

module.exports = { authController };
