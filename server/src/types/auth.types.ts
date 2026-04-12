import { z } from 'zod';

// ─── Registration ────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['student', 'faculty', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, faculty, or admin' }),
  }),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
});

// ─── Login ───────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── OTP Verification ───────────────────────────────────────────
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['email_verify', 'password_reset']),
});

// ─── Forgot Password ───────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ─── Reset Password ─────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ─── Resend OTP ─────────────────────────────────────────────────
export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['email_verify', 'password_reset']),
});

// ─── Types ───────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
