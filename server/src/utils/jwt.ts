import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

/** Generate a 6-digit numeric OTP */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Get refresh token expiry as a Date */
export function getRefreshTokenExpiry(): Date {
  const match = REFRESH_EXPIRY.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

  const value = parseInt(match[1]);
  const unit = match[2];
  const ms = {
    d: value * 24 * 60 * 60 * 1000,
    h: value * 60 * 60 * 1000,
    m: value * 60 * 1000,
    s: value * 1000,
  }[unit] || 7 * 24 * 60 * 60 * 1000;

  return new Date(Date.now() + ms);
}
