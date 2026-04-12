import { z } from 'zod';
export declare const createNoticeSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["general", "academic", "exam", "event", "urgent"]>>;
    pdfBase64: z.ZodOptional<z.ZodString>;
    pdfFileName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    category: "event" | "general" | "academic" | "exam" | "urgent";
    pdfBase64?: string | undefined;
    pdfFileName?: string | undefined;
}, {
    title: string;
    content: string;
    category?: "event" | "general" | "academic" | "exam" | "urgent" | undefined;
    pdfBase64?: string | undefined;
    pdfFileName?: string | undefined;
}>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export declare const updateNoticeSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodEnum<["general", "academic", "exam", "event", "urgent"]>>>;
    pdfBase64: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    pdfFileName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    category?: "event" | "general" | "academic" | "exam" | "urgent" | undefined;
    pdfBase64?: string | undefined;
    pdfFileName?: string | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    category?: "event" | "general" | "academic" | "exam" | "urgent" | undefined;
    pdfBase64?: string | undefined;
    pdfFileName?: string | undefined;
}>;
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;
//# sourceMappingURL=notice.types.d.ts.map