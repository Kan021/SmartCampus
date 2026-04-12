import { z } from 'zod';

// ─── Subjects ────────────────────────────────────────────────────
export const createSubjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  semester: z.number().int().min(1).max(10),
  department: z.string().min(1).max(100),
  credits: z.number().int().min(1).max(10).default(4),
  maxInternal: z.number().int().min(0).max(100).default(40),
  maxExternal: z.number().int().min(0).max(100).default(60),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

// ─── Marks ───────────────────────────────────────────────────────
export const uploadMarkSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  internal: z.number().min(0).max(100),
  external: z.number().min(0).max(100),
  semester: z.number().int().min(1).max(10),
});
export type UploadMarkInput = z.infer<typeof uploadMarkSchema>;

export const bulkUploadMarksSchema = z.object({
  marks: z.array(uploadMarkSchema).min(1).max(200),
});
export type BulkUploadMarksInput = z.infer<typeof bulkUploadMarksSchema>;

// ─── Fee Structure ───────────────────────────────────────────────
export const createFeeStructureSchema = z.object({
  semester: z.number().int().min(1).max(10),
  year: z.number().int().min(2020).max(2035),
  course: z.string().min(1).max(100),
  category: z.enum(['tuition', 'hostel', 'exam', 'lab', 'library', 'transport']),
  amount: z.number().min(0),
  dueDate: z.string().optional().nullable(), // ISO date string
});
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;

// ─── Fee Payment ─────────────────────────────────────────────────
export const markFeePaymentSchema = z.object({
  studentId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
  amountPaid: z.number().min(0),
  transactionRef: z.string().max(100).optional().nullable(),
  remarks: z.string().max(300).optional().nullable(),
});
export type MarkFeePaymentInput = z.infer<typeof markFeePaymentSchema>;

// ─── Academic Calendar ───────────────────────────────────────────
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  date: z.string(), // ISO date
  endDate: z.string().optional().nullable(),
  category: z.enum(['exam', 'holiday', 'deadline', 'event', 'general']).default('general'),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;
