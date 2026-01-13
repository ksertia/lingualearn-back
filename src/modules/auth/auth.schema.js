const { z } = require('zod');

// Registration schema
const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string()
        .optional()
        .refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), 'Invalid phone number format'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username too long')
        .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, dots and underscores')
        .optional()
        .nullable(),
    accountType: z.enum(['admin', 'parent', 'child', 'teacher']).default('parent'),
    parentId: z.string().optional() // For child accounts
}).refine(data => data.email || data.phone, {
    message: 'Either email or phone must be provided',
    path: ['email']
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

// Reset password schema
const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter and one number')
});

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
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter and one number')
});

// Refresh token schema
const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifySchema,
    changePasswordSchema,
    refreshTokenSchema
};
