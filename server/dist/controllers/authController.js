"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.refresh = refresh;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.resendOtp = resendOtp;
exports.logout = logout;
exports.me = me;
const authService = __importStar(require("../services/authService"));
// ─── REGISTER ────────────────────────────────────────────────────
async function register(req, res) {
    try {
        const result = await authService.registerUser(req.body);
        res.status(201).json({ success: true, message: result.message, data: result });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── VERIFY OTP ──────────────────────────────────────────────────
async function verifyOtp(req, res) {
    try {
        const result = await authService.verifyOtp(req.body);
        res.status(200).json({ success: true, message: result.message, data: result });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── LOGIN ───────────────────────────────────────────────────────
async function login(req, res) {
    try {
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.socket.remoteAddress;
        const result = await authService.loginUser(req.body, userAgent, ipAddress);
        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken: result.accessToken,
                user: result.user,
            },
        });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── REFRESH TOKEN ───────────────────────────────────────────────
async function refresh(req, res) {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) {
            res.status(401).json({ success: false, message: 'No refresh token provided' });
            return;
        }
        const result = await authService.refreshAccessToken(token);
        res.status(200).json({ success: true, message: 'Token refreshed', data: result });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── FORGOT PASSWORD ────────────────────────────────────────────
async function forgotPassword(req, res) {
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.status(200).json({ success: true, message: result.message });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── RESET PASSWORD ─────────────────────────────────────────────
async function resetPassword(req, res) {
    try {
        const result = await authService.resetPassword(req.body);
        res.status(200).json({ success: true, message: result.message });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── RESEND OTP ──────────────────────────────────────────────────
async function resendOtp(req, res) {
    try {
        const result = await authService.resendOtp(req.body.email, req.body.type);
        res.status(200).json({ success: true, message: result.message });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── LOGOUT ──────────────────────────────────────────────────────
async function logout(req, res) {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (token) {
            await authService.logoutUser(token);
        }
        res.clearCookie('refreshToken', { path: '/' });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
// ─── GET CURRENT USER ────────────────────────────────────────────
async function me(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }
        const user = await authService.getCurrentUser(req.user.userId);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}
//# sourceMappingURL=authController.js.map