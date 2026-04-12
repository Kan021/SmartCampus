import { z } from 'zod';
export declare const createBookSchema: z.ZodObject<{
    title: z.ZodString;
    author: z.ZodString;
    isbn: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["general", "academic", "reference", "novel", "journal", "magazine"]>>;
    publisher: z.ZodOptional<z.ZodString>;
    publishYear: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    totalCopies: z.ZodDefault<z.ZodNumber>;
    shelfLocation: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    category: "general" | "academic" | "reference" | "novel" | "journal" | "magazine";
    author: string;
    isbn: string;
    totalCopies: number;
    description?: string | undefined;
    publisher?: string | undefined;
    publishYear?: number | undefined;
    shelfLocation?: string | undefined;
}, {
    title: string;
    author: string;
    isbn: string;
    category?: "general" | "academic" | "reference" | "novel" | "journal" | "magazine" | undefined;
    description?: string | undefined;
    publisher?: string | undefined;
    publishYear?: number | undefined;
    totalCopies?: number | undefined;
    shelfLocation?: string | undefined;
}>;
export declare const updateBookSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    isbn: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodEnum<["general", "academic", "reference", "novel", "journal", "magazine"]>>>;
    publisher: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    publishYear: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    totalCopies: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    shelfLocation: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    category?: "general" | "academic" | "reference" | "novel" | "journal" | "magazine" | undefined;
    description?: string | undefined;
    author?: string | undefined;
    isbn?: string | undefined;
    publisher?: string | undefined;
    publishYear?: number | undefined;
    totalCopies?: number | undefined;
    shelfLocation?: string | undefined;
}, {
    title?: string | undefined;
    category?: "general" | "academic" | "reference" | "novel" | "journal" | "magazine" | undefined;
    description?: string | undefined;
    author?: string | undefined;
    isbn?: string | undefined;
    publisher?: string | undefined;
    publishYear?: number | undefined;
    totalCopies?: number | undefined;
    shelfLocation?: string | undefined;
}>;
export declare const issueBookSchema: z.ZodObject<{
    bookId: z.ZodString;
    studentId: z.ZodString;
    dueDate: z.ZodEffects<z.ZodString, string, string>;
    remarks: z.ZodOptional<z.ZodString>;
    penaltyRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    studentId: string;
    bookId: string;
    dueDate: string;
    penaltyRate: number;
    remarks?: string | undefined;
}, {
    studentId: string;
    bookId: string;
    dueDate: string;
    remarks?: string | undefined;
    penaltyRate?: number | undefined;
}>;
export declare const returnBookSchema: z.ZodObject<{
    remarks: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    remarks?: string | undefined;
}, {
    remarks?: string | undefined;
}>;
export declare const markPenaltyPaidSchema: z.ZodObject<{
    penaltyPaid: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    penaltyPaid: boolean;
}, {
    penaltyPaid: boolean;
}>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type IssueBookInput = z.infer<typeof issueBookSchema>;
export type ReturnBookInput = z.infer<typeof returnBookSchema>;
//# sourceMappingURL=library.types.d.ts.map