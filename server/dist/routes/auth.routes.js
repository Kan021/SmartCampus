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
const express_1 = require("express");
const authController = __importStar(require("../controllers/authController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_types_1 = require("../types/auth.types");
const router = (0, express_1.Router)();
// ─── Public Routes ───────────────────────────────────────────────
router.post('/register', (0, validate_middleware_1.validate)(auth_types_1.registerSchema), authController.register);
router.post('/verify-otp', (0, validate_middleware_1.validate)(auth_types_1.verifyOtpSchema), authController.verifyOtp);
router.post('/login', (0, validate_middleware_1.validate)(auth_types_1.loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', (0, validate_middleware_1.validate)(auth_types_1.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', (0, validate_middleware_1.validate)(auth_types_1.resetPasswordSchema), authController.resetPassword);
router.post('/resend-otp', (0, validate_middleware_1.validate)(auth_types_1.resendOtpSchema), authController.resendOtp);
// ─── Protected Routes ────────────────────────────────────────────
router.get('/me', auth_middleware_1.authenticate, authController.me);
router.post('/logout', auth_middleware_1.authenticate, authController.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map