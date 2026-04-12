"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateOtp = generateOtp;
exports.getRefreshTokenExpiry = getRefreshTokenExpiry;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
/** Generate a 6-digit numeric OTP */
function generateOtp() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
/** Get refresh token expiry as a Date */
function getRefreshTokenExpiry() {
    const match = REFRESH_EXPIRY.match(/^(\d+)([dhms])$/);
    if (!match)
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d
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
//# sourceMappingURL=jwt.js.map