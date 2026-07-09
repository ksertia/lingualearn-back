const { z } = require('zod');
const { email } = require('zod/v4');

// Inscription publique (learner, admin, teacher, platform_manager)
const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string()
        .optional()
        .refine(val => !val || /^\+?[0-9]{8,15}$/.test(val.replace(/[\s\-]/g, '')), 'Invalid phone number format'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username too long')
        .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, dots and underscores')
        .optional()
        .nullable(),
    accountType: z.enum(['admin', 'learner', 'plateform_manager', 'teacher']),
    referralCode: z.string().max(20).optional().nullable(),
}).refine(data => data.email || data.phone, {
    message: 'Either email or phone must be provided',
    path: ['email']
});


// Création d'un compte enfant par le parent connecté 
const addChildSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long'),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string()
        .optional()
        .refine(val => !val || /^\+?[0-9]{8,15}$/.test(val.replace(/[\s\-]/g, '')), 'Invalid phone number format'),
});

// Login schema (loginInfo: username, email, or phone)
const loginSchema = z.object({
    loginInfo: z.string().min(1, 'loginInfo is required'),
    password: z.string().min(1, 'Password is required')
});

// Forgot password schema
const forgotPasswordSchema = z.object({
    loginInfo: z.string().min(1, 'loginInfo is required')
});

// Schema de validation pour vérifier l'OTP
const verifyOTPSchema = z.object({
    loginInfo: z.string().min(1),
    otp: z.string().min(4).max(6),
});

// Reset password schema
const resetPasswordSchema = z.object({
  loginInfo: z.string().min(1),
  otp: z.string().min(4).max(6),
  password: z.string().min(6)  // définir une taille minimale pour le mot de passe
});

// const resetPasswordSchema = z.object({
//     token: z.string().min(1, 'Token is required'),
//     password: z.string()
//         .min(6, 'Password must be at least 6 characters')
//         .max(100, 'Password too long')
// });

// Verify email/phone schema
const verifySchema = z.object({
    token: z.string().min(1, 'Token is required')
});

// Change password schema
const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long')
});

// Refresh token schema
const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

module.exports = {
    registerSchema,
    addChildSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifySchema,
    changePasswordSchema,
    refreshTokenSchema,
    verifyOTPSchema
};