"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.verifyOtpSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ─── Registration ────────────────────────────────────────────────
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: zod_1.z.enum(['student', 'faculty', 'admin'], {
        errorMap: () => ({ message: 'Role must be student, faculty, or admin' }),
    }),
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters').max(100),
});
// ─── Login ───────────────────────────────────────────────────────
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ─── OTP Verification ───────────────────────────────────────────
exports.verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().length(6, 'OTP must be 6 digits'),
    type: zod_1.z.enum(['email_verify', 'password_reset']),
});
// ─── Forgot Password ───────────────────────────────────────────
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
// ─── Reset Password ─────────────────────────────────────────────
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().length(6, 'OTP must be 6 digits'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});
// ─── Resend OTP ─────────────────────────────────────────────────
exports.resendOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    type: zod_1.z.enum(['email_verify', 'password_reset']),
});
//# sourceMappingURL=auth.types.js.map