import { Request, Response } from 'express';
import * as authService from '../services/authService';

// ─── REGISTER ────────────────────────────────────────────────────
export async function register(req: Request, res: Response) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── VERIFY OTP ──────────────────────────────────────────────────
export async function verifyOtp(req: Request, res: Response) {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────
export async function login(req: Request, res: Response) {
  try {
    const userAgent = req.headers['user-agent'];
    const rawIp = req.ip || req.socket.remoteAddress || '';
    const ipAddress = rawIp.replace(/^::ffff:/, ''); // strip IPv4-mapped IPv6 prefix

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
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── REFRESH TOKEN ───────────────────────────────────────────────
export async function refresh(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    const result = await authService.refreshAccessToken(token);
    res.status(200).json({ success: true, message: 'Token refreshed', data: result });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── FORGOT PASSWORD ────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── RESET PASSWORD ─────────────────────────────────────────────
export async function resetPassword(req: Request, res: Response) {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── RESEND OTP ──────────────────────────────────────────────────
export async function resendOtp(req: Request, res: Response) {
  try {
    const result = await authService.resendOtp(req.body.email, req.body.type);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── LOGOUT ──────────────────────────────────────────────────────
export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await authService.logoutUser(token);
    }

    res.clearCookie('refreshToken', { path: '/' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}

// ─── GET CURRENT USER ────────────────────────────────────────────
export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
}
