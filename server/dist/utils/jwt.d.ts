export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
export declare function generateAccessToken(payload: TokenPayload): string;
export declare function generateRefreshToken(payload: TokenPayload): string;
export declare function verifyAccessToken(token: string): TokenPayload;
export declare function verifyRefreshToken(token: string): TokenPayload;
/** Generate a 6-digit numeric OTP */
export declare function generateOtp(): string;
/** Get refresh token expiry as a Date */
export declare function getRefreshTokenExpiry(): Date;
//# sourceMappingURL=jwt.d.ts.map