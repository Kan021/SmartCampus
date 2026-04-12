import { z } from 'zod';

// ─── Book ─────────────────────────────────────────────────────
export const createBookSchema = z.object({
  title:          z.string().min(2, 'Title required').max(300),
  author:         z.string().min(2, 'Author required').max(200),
  isbn:           z.string().min(5, 'ISBN required').max(30),
  category:       z.enum(['general', 'academic', 'reference', 'novel', 'journal', 'magazine']).default('general'),
  publisher:      z.string().max(200).optional(),
  publishYear:    z.number().int().min(1800).max(2100).optional(),
  description:    z.string().max(1000).optional(),
  totalCopies:    z.number().int().min(1).max(500).default(1),
  shelfLocation:  z.string().max(50).optional(),
});

export const updateBookSchema = createBookSchema.partial();

// ─── Issue ───────────────────────────────────────────────────
export const issueBookSchema = z.object({
  bookId:    z.string().uuid('Invalid book ID'),
  studentId: z.string().uuid('Invalid student ID'),
  dueDate:   z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid due date'),
  remarks:   z.string().max(500).optional(),
  penaltyRate: z.number().min(0).max(100).default(2),
});

// ─── Return ──────────────────────────────────────────────────
export const returnBookSchema = z.object({
  remarks: z.string().max(500).optional(),
});

// ─── Mark Penalty Paid ─────────────────────────────────────────────
export const markPenaltyPaidSchema = z.object({
  penaltyPaid: z.boolean(),
});

export type CreateBookInput   = z.infer<typeof createBookSchema>;
export type IssueBookInput    = z.infer<typeof issueBookSchema>;
export type ReturnBookInput   = z.infer<typeof returnBookSchema>;
