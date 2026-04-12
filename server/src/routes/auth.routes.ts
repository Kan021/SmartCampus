import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOtpSchema,
} from '../types/auth.types';

const router = Router();

// ─── Public Routes ───────────────────────────────────────────────
router.post('/register',        validate(registerSchema),        authController.register);
router.post('/verify-otp',      validate(verifyOtpSchema),       authController.verifyOtp);
router.post('/login',           validate(loginSchema),           authController.login);
router.post('/refresh',                                          authController.refresh);
router.post('/forgot-password', validate(forgotPasswordSchema),  authController.forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),   authController.resetPassword);
router.post('/resend-otp',      validate(resendOtpSchema),       authController.resendOtp);

// ─── Protected Routes ────────────────────────────────────────────
router.get('/me',               authenticate,                    authController.me);
router.post('/logout',          authenticate,                    authController.logout);

export default router;
