import { z } from 'zod';
export declare const createSessionSchema: z.ZodObject<{
    subject: z.ZodString;
    date: z.ZodEffects<z.ZodString, string, string>;
    duration: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    subject: string;
    date: string;
    duration: number;
}, {
    subject: string;
    date: string;
    duration?: number | undefined;
}>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export declare const markAttendanceSchema: z.ZodObject<{
    sessionCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionCode: string;
}, {
    sessionCode: string;
}>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
//# sourceMappingURL=attendance.types.d.ts.map