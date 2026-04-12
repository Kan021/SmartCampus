"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.verifyOtp = verifyOtp;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.resendOtp = resendOtp;
exports.logoutUser = logoutUser;
exports.getCurrentUser = getCurrentUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const emailService_1 = require("./emailService");
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30');
// ─── REGISTER ────────────────────────────────────────────────────
async function registerUser(input) {
    // Check if user already exists
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw { status: 409, message: 'An account with this email already exists' };
    }
    // Hash password
    const passwordHash = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    // Create user — auto-verify in dev mode to skip OTP flow
    const devMode = process.env.NODE_ENV !== 'production';
    const user = await prisma_1.prisma.user.create({
        data: {
            email: input.email,
            fullName: input.fullName,
            passwordHash,
            role: input.role,
            isVerified: devMode, // ⚡ DEV: skip OTP verification
        },
    });
    if (devMode) {
        // Skip OTP entirely in development
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isVerified: true,
            message: '✅ DEV MODE: Account created and auto-verified. You can log in immediately.',
        };
    }
    // Generate and store OTP (production only)
    const otp = (0, jwt_1.generateOtp)();
    await prisma_1.prisma.otpToken.create({
        data: {
            userId: user.id,
            code: otp,
            type: 'email_verify',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        },
    });
    // Send verification email
    await (0, emailService_1.sendVerificationEmail)(user.email, otp);
    return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        message: 'Registration successful. Please check your email for the verification code.',
    };
}
// ─── VERIFY OTP ──────────────────────────────────────────────────
async function verifyOtp(input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    // Find valid OTP
    const otpRecord = await prisma_1.prisma.otpToken.findFirst({
        where: {
            userId: user.id,
            code: input.code,
            type: input.type,
            used: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!otpRecord) {
        throw { status: 400, message: 'Invalid or expired OTP code' };
    }
    // Mark OTP as used
    await prisma_1.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { used: true },
    });
    // If email verification, mark user as verified
    if (input.type === 'email_verify') {
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });
    }
    return {
        verified: true,
        type: input.type,
        message: input.type === 'email_verify'
            ? 'Email verified successfully. You can now log in.'
            : 'OTP verified. You can now set a new password.',
    };
}
// ─── LOGIN ───────────────────────────────────────────────────────
async function loginUser(input, userAgent, ipAddress) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw { status: 401, message: 'Invalid email or password' };
    }
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw {
            status: 423,
            message: `Account is locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
        };
    }
    // Check if email is verified (skipped in dev mode)
    if (!user.isVerified && process.env.NODE_ENV === 'production') {
        throw {
            status: 403,
            message: 'Email not verified. Please verify your email first.',
        };
    }
    // Verify password
    const isPasswordValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
        // Increment failed login count
        const newCount = user.failedLoginCount + 1;
        const updateData = { failedLoginCount: newCount };
        // Lock account if max attempts reached
        if (newCount >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
            updateData.failedLoginCount = 0;
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });
        const remaining = MAX_FAILED_ATTEMPTS - newCount;
        throw {
            status: 401,
            message: remaining > 0
                ? `Invalid email or password. ${remaining} attempt(s) remaining.`
                : `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to too many failed attempts.`,
        };
    }
    // Reset failed login count on successful login
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    // Generate tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = (0, jwt_1.generateAccessToken)(payload);
    const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
    // Store refresh token
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: (0, jwt_1.getRefreshTokenExpiry)(),
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
        },
    });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isVerified: user.isVerified,
        },
    };
}
// ─── REFRESH TOKEN ───────────────────────────────────────────────
async function refreshAccessToken(token) {
    // Verify the refresh token
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(token);
    }
    catch {
        throw { status: 401, message: 'Invalid or expired refresh token' };
    }
    // Check if token exists and is not revoked
    const storedToken = await prisma_1.prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken || storedToken.revoked) {
        throw { status: 401, message: 'Refresh token has been revoked' };
    }
    // Check expiry
    if (storedToken.expiresAt < new Date()) {
        throw { status: 401, message: 'Refresh token has expired' };
    }
    // Generate new access token
    const newAccessToken = (0, jwt_1.generateAccessToken)({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
    });
    return { accessToken: newAccessToken };
}
// ─── FORGOT PASSWORD ─────────────────────────────────────────────
async function forgotPassword(email) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
        return { message: 'If an account with that email exists, a reset code has been sent.' };
    }
    // Invalidate any existing password reset OTPs
    await prisma_1.prisma.otpToken.updateMany({
        where: { userId: user.id, type: 'password_reset', used: false },
        data: { used: true },
    });
    // Generate new OTP
    const otp = (0, jwt_1.generateOtp)();
    await prisma_1.prisma.otpToken.create({
        data: {
            userId: user.id,
            code: otp,
            type: 'password_reset',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        },
    });
    await (0, emailService_1.sendPasswordResetEmail)(email, otp);
    return { message: 'If an account with that email exists, a reset code has been sent.' };
}
// ─── RESET PASSWORD ──────────────────────────────────────────────
async function resetPassword(input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    // Verify OTP
    const otpRecord = await prisma_1.prisma.otpToken.findFirst({
        where: {
            userId: user.id,
            code: input.code,
            type: 'password_reset',
            used: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!otpRecord) {
        throw { status: 400, message: 'Invalid or expired reset code' };
    }
    // Hash new password
    const passwordHash = await bcryptjs_1.default.hash(input.newPassword, SALT_ROUNDS);
    // Update password and mark OTP as used
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
        }),
        prisma_1.prisma.otpToken.update({
            where: { id: otpRecord.id },
            data: { used: true },
        }),
        // Revoke all refresh tokens (force re-login on all devices)
        prisma_1.prisma.refreshToken.updateMany({
            where: { userId: user.id, revoked: false },
            data: { revoked: true },
        }),
    ]);
    return { message: 'Password has been reset successfully. Please log in with your new password.' };
}
// ─── RESEND OTP ──────────────────────────────────────────────────
async function resendOtp(email, type) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    if (type === 'email_verify' && user.isVerified) {
        throw { status: 400, message: 'Email is already verified' };
    }
    // Rate limit: check last OTP sent
    const recentOtp = await prisma_1.prisma.otpToken.findFirst({
        where: {
            userId: user.id,
            type,
            createdAt: { gt: new Date(Date.now() - 60 * 1000) }, // within last 60 seconds
        },
    });
    if (recentOtp) {
        throw { status: 429, message: 'Please wait at least 60 seconds before requesting a new code.' };
    }
    // Invalidate old OTPs
    await prisma_1.prisma.otpToken.updateMany({
        where: { userId: user.id, type, used: false },
        data: { used: true },
    });
    // Generate new OTP
    const otp = (0, jwt_1.generateOtp)();
    await prisma_1.prisma.otpToken.create({
        data: {
            userId: user.id,
            code: otp,
            type,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        },
    });
    if (type === 'email_verify') {
        await (0, emailService_1.sendVerificationEmail)(email, otp);
    }
    else {
        await (0, emailService_1.sendPasswordResetEmail)(email, otp);
    }
    return { message: 'A new verification code has been sent to your email.' };
}
// ─── LOGOUT ──────────────────────────────────────────────────────
async function logoutUser(refreshToken) {
    await prisma_1.prisma.refreshToken.updateMany({
        where: { token: refreshToken, revoked: false },
        data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
}
// ─── GET CURRENT USER ────────────────────────────────────────────
async function getCurrentUser(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isVerified: true,
            lastLoginAt: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    return user;
}
//# sourceMappingURL=authService.js.map