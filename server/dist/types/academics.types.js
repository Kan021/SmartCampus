"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventSchema = exports.markFeePaymentSchema = exports.createFeeStructureSchema = exports.bulkUploadMarksSchema = exports.uploadMarkSchema = exports.createSubjectSchema = void 0;
const zod_1 = require("zod");
// ─── Subjects ────────────────────────────────────────────────────
exports.createSubjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    code: zod_1.z.string().min(1).max(20),
    semester: zod_1.z.number().int().min(1).max(10),
    department: zod_1.z.string().min(1).max(100),
    credits: zod_1.z.number().int().min(1).max(10).default(4),
    maxInternal: zod_1.z.number().int().min(0).max(100).default(40),
    maxExternal: zod_1.z.number().int().min(0).max(100).default(60),
});
// ─── Marks ───────────────────────────────────────────────────────
exports.uploadMarkSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid(),
    subjectId: zod_1.z.string().uuid(),
    internal: zod_1.z.number().min(0).max(100),
    external: zod_1.z.number().min(0).max(100),
    semester: zod_1.z.number().int().min(1).max(10),
});
exports.bulkUploadMarksSchema = zod_1.z.object({
    marks: zod_1.z.array(exports.uploadMarkSchema).min(1).max(200),
});
// ─── Fee Structure ───────────────────────────────────────────────
exports.createFeeStructureSchema = zod_1.z.object({
    semester: zod_1.z.number().int().min(1).max(10),
    year: zod_1.z.number().int().min(2020).max(2035),
    course: zod_1.z.string().min(1).max(100),
    category: zod_1.z.enum(['tuition', 'hostel', 'exam', 'lab', 'library', 'transport']),
    amount: zod_1.z.number().min(0),
    dueDate: zod_1.z.string().optional().nullable(), // ISO date string
});
// ─── Fee Payment ─────────────────────────────────────────────────
exports.markFeePaymentSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid(),
    feeStructureId: zod_1.z.string().uuid(),
    amountPaid: zod_1.z.number().min(0),
    transactionRef: zod_1.z.string().max(100).optional().nullable(),
    remarks: zod_1.z.string().max(300).optional().nullable(),
});
// ─── Academic Calendar ───────────────────────────────────────────
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(500).optional().nullable(),
    date: zod_1.z.string(), // ISO date
    endDate: zod_1.z.string().optional().nullable(),
    category: zod_1.z.enum(['exam', 'holiday', 'deadline', 'event', 'general']).default('general'),
});
//# sourceMappingURL=academics.types.js.map