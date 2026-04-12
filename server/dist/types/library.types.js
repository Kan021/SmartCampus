"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPenaltyPaidSchema = exports.returnBookSchema = exports.issueBookSchema = exports.updateBookSchema = exports.createBookSchema = void 0;
const zod_1 = require("zod");
// ─── Book ─────────────────────────────────────────────────────
exports.createBookSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title required').max(300),
    author: zod_1.z.string().min(2, 'Author required').max(200),
    isbn: zod_1.z.string().min(5, 'ISBN required').max(30),
    category: zod_1.z.enum(['general', 'academic', 'reference', 'novel', 'journal', 'magazine']).default('general'),
    publisher: zod_1.z.string().max(200).optional(),
    publishYear: zod_1.z.number().int().min(1800).max(2100).optional(),
    description: zod_1.z.string().max(1000).optional(),
    totalCopies: zod_1.z.number().int().min(1).max(500).default(1),
    shelfLocation: zod_1.z.string().max(50).optional(),
});
exports.updateBookSchema = exports.createBookSchema.partial();
// ─── Issue ───────────────────────────────────────────────────
exports.issueBookSchema = zod_1.z.object({
    bookId: zod_1.z.string().uuid('Invalid book ID'),
    studentId: zod_1.z.string().uuid('Invalid student ID'),
    dueDate: zod_1.z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid due date'),
    remarks: zod_1.z.string().max(500).optional(),
    penaltyRate: zod_1.z.number().min(0).max(100).default(2),
});
// ─── Return ──────────────────────────────────────────────────
exports.returnBookSchema = zod_1.z.object({
    remarks: zod_1.z.string().max(500).optional(),
});
// ─── Mark Penalty Paid ─────────────────────────────────────────────
exports.markPenaltyPaidSchema = zod_1.z.object({
    penaltyPaid: zod_1.z.boolean(),
});
//# sourceMappingURL=library.types.js.map