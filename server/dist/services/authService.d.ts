import { RegisterInput, LoginInput, VerifyOtpInput, ResetPasswordInput } from '../types/auth.types';
export declare function registerUser(input: RegisterInput): Promise<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    isVerified: boolean;
    message: string;
}>;
export declare function verifyOtp(input: VerifyOtpInput): Promise<{
    verified: boolean;
    type: "email_verify" | "password_reset";
    message: string;
}>;
export declare function loginUser(input: LoginInput, userAgent?: string, ipAddress?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: string;
        isVerified: boolean;
    };
}>;
export declare function refreshAccessToken(token: string): Promise<{
    accessToken: string;
}>;
export declare function forgotPassword(email: string): Promise<{
    message: string;
}>;
export declare function resetPassword(input: ResetPasswordInput): Promise<{
    message: string;
}>;
export declare function resendOtp(email: string, type: 'email_verify' | 'password_reset'): Promise<{
    message: string;
}>;
export declare function logoutUser(refreshToken: string): Promise<{
    message: string;
}>;
export declare function getCurrentUser(userId: string): Promise<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    isVerified: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
}>;
//# sourceMappingURL=authService.d.ts.map