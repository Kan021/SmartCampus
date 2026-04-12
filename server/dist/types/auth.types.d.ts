import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["student", "faculty", "admin"]>;
    fullName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    fullName: string;
    role: "faculty" | "student" | "admin";
    password: string;
}, {
    email: string;
    fullName: string;
    role: "faculty" | "student" | "admin";
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const verifyOtpSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
    type: z.ZodEnum<["email_verify", "password_reset"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    code: string;
    type: "email_verify" | "password_reset";
}, {
    email: string;
    code: string;
    type: "email_verify" | "password_reset";
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    code: string;
    newPassword: string;
}, {
    email: string;
    code: string;
    newPassword: string;
}>;
export declare const resendOtpSchema: z.ZodObject<{
    email: z.ZodString;
    type: z.ZodEnum<["email_verify", "password_reset"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    type: "email_verify" | "password_reset";
}, {
    email: string;
    type: "email_verify" | "password_reset";
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
//# sourceMappingURL=auth.types.d.ts.map