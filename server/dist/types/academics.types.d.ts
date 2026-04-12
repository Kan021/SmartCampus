import { z } from 'zod';
export declare const createSubjectSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    semester: z.ZodNumber;
    department: z.ZodString;
    credits: z.ZodDefault<z.ZodNumber>;
    maxInternal: z.ZodDefault<z.ZodNumber>;
    maxExternal: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code: string;
    semester: number;
    department: string;
    credits: number;
    maxInternal: number;
    maxExternal: number;
}, {
    name: string;
    code: string;
    semester: number;
    department: string;
    credits?: number | undefined;
    maxInternal?: number | undefined;
    maxExternal?: number | undefined;
}>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export declare const uploadMarkSchema: z.ZodObject<{
    studentId: z.ZodString;
    subjectId: z.ZodString;
    internal: z.ZodNumber;
    external: z.ZodNumber;
    semester: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    studentId: string;
    subjectId: string;
    internal: number;
    external: number;
    semester: number;
}, {
    studentId: string;
    subjectId: string;
    internal: number;
    external: number;
    semester: number;
}>;
export type UploadMarkInput = z.infer<typeof uploadMarkSchema>;
export declare const bulkUploadMarksSchema: z.ZodObject<{
    marks: z.ZodArray<z.ZodObject<{
        studentId: z.ZodString;
        subjectId: z.ZodString;
        internal: z.ZodNumber;
        external: z.ZodNumber;
        semester: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        studentId: string;
        subjectId: string;
        internal: number;
        external: number;
        semester: number;
    }, {
        studentId: string;
        subjectId: string;
        internal: number;
        external: number;
        semester: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    marks: {
        studentId: string;
        subjectId: string;
        internal: number;
        external: number;
        semester: number;
    }[];
}, {
    marks: {
        studentId: string;
        subjectId: string;
        internal: number;
        external: number;
        semester: number;
    }[];
}>;
export type BulkUploadMarksInput = z.infer<typeof bulkUploadMarksSchema>;
export declare const createFeeStructureSchema: z.ZodObject<{
    semester: z.ZodNumber;
    year: z.ZodNumber;
    course: z.ZodString;
    category: z.ZodEnum<["tuition", "hostel", "exam", "lab", "library", "transport"]>;
    amount: z.ZodNumber;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    category: "hostel" | "exam" | "tuition" | "lab" | "library" | "transport";
    semester: number;
    amount: number;
    year: number;
    course: string;
    dueDate?: string | null | undefined;
}, {
    category: "hostel" | "exam" | "tuition" | "lab" | "library" | "transport";
    semester: number;
    amount: number;
    year: number;
    course: string;
    dueDate?: string | null | undefined;
}>;
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export declare const markFeePaymentSchema: z.ZodObject<{
    studentId: z.ZodString;
    feeStructureId: z.ZodString;
    amountPaid: z.ZodNumber;
    transactionRef: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    remarks: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    studentId: string;
    feeStructureId: string;
    amountPaid: number;
    transactionRef?: string | null | undefined;
    remarks?: string | null | undefined;
}, {
    studentId: string;
    feeStructureId: string;
    amountPaid: number;
    transactionRef?: string | null | undefined;
    remarks?: string | null | undefined;
}>;
export type MarkFeePaymentInput = z.infer<typeof markFeePaymentSchema>;
export declare const createEventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    date: z.ZodString;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodDefault<z.ZodEnum<["exam", "holiday", "deadline", "event", "general"]>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    title: string;
    category: "event" | "general" | "exam" | "holiday" | "deadline";
    description?: string | null | undefined;
    endDate?: string | null | undefined;
}, {
    date: string;
    title: string;
    category?: "event" | "general" | "exam" | "holiday" | "deadline" | undefined;
    description?: string | null | undefined;
    endDate?: string | null | undefined;
}>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
//# sourceMappingURL=academics.types.d.ts.map